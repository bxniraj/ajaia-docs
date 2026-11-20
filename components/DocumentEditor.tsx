"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { DocDetail } from "@/lib/documents";
import { MAX_TITLE } from "@/lib/validation";
import { ApiError, api, formatTime } from "./api";
import SharePanel from "./SharePanel";
import Toolbar from "./Toolbar";

type SaveStatus = "saved" | "unsaved" | "saving" | "error" | "conflict";
type Patch = { title?: string; content?: string };

const AUTOSAVE_MS = 800;

export default function DocumentEditor({ initialDoc }: { initialDoc: DocDetail }) {
  const editable = initialDoc.access !== "viewer";
  const [title, setTitle] = useState(initialDoc.title);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState(initialDoc.updatedAt);
  const [shareOpen, setShareOpen] = useState(false);

  // Save pipeline: edits accumulate in `pending`, one request in flight at a time.
  const pending = useRef<Patch>({});
  const inFlight = useRef(false);
  const flushAgain = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const baseUpdatedAt = useRef(initialDoc.updatedAt);

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    if (inFlight.current) {
      flushAgain.current = true;
      return;
    }
    const patch = pending.current;
    if (patch.title === undefined && patch.content === undefined) return;
    pending.current = {};
    inFlight.current = true;
    setStatus("saving");
    try {
      const doc = await api<DocDetail>(`/api/documents/${initialDoc.id}`, {
        method: "PATCH",
        body: JSON.stringify({ ...patch, baseUpdatedAt: baseUpdatedAt.current }),
      });
      baseUpdatedAt.current = doc.updatedAt;
      setSavedAt(doc.updatedAt);
      setSaveError(null);
      const more = pending.current.title !== undefined || pending.current.content !== undefined;
      setStatus(more ? "unsaved" : "saved");
    } catch (e) {
      // Put the failed edits back (newer edits win) so "Retry" re-sends them.
      pending.current = { ...patch, ...pending.current };
      setSaveError((e as Error).message);
      setStatus(e instanceof ApiError && e.status === 409 ? "conflict" : "error");
      flushAgain.current = false;
    } finally {
      inFlight.current = false;
      if (flushAgain.current) {
        flushAgain.current = false;
        void flush();
      }
    }
  }, [initialDoc.id]);

  const queue = useCallback(
    (patch: Patch) => {
      pending.current = { ...pending.current, ...patch };
      setStatus((s) => (s === "conflict" ? s : "unsaved"));
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), AUTOSAVE_MS);
    },
    [flush],
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: { openOnClick: !editable } }),
      Placeholder.configure({ placeholder: editable ? "Start writing…" : "This document is empty." }),
    ],
    content: initialDoc.content,
    editable,
    immediatelyRender: false, // avoid SSR hydration mismatch
    editorProps: { attributes: { class: "doc-body", spellcheck: "true" } },
    onUpdate: ({ editor: e }) => queue({ content: e.getHTML() }),
  });

  // Ctrl/Cmd+S saves immediately; warn before leaving with unsaved edits.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void flush();
      }
    };
    const onUnload = (e: BeforeUnloadEvent) => {
      if (status !== "saved") e.preventDefault();
    };
    // Last-chance save: keepalive lets the request finish after the page is gone.
    const onPageHide = () => {
      const patch = pending.current;
      if (patch.title === undefined && patch.content === undefined) return;
      pending.current = {};
      void fetch(`/api/documents/${initialDoc.id}`, {
        method: "PATCH",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...patch, baseUpdatedAt: baseUpdatedAt.current }),
      });
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onUnload);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onUnload);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [flush, status, initialDoc.id]);

  // Flush anything pending when leaving the page via client-side navigation.
  useEffect(() => () => void flush(), [flush]);

  function onTitleChange(value: string) {
    setTitle(value);
    const trimmed = value.trim();
    if (!trimmed) return setTitleError("Title cannot be empty");
    if (trimmed.length > MAX_TITLE) return setTitleError(`Max ${MAX_TITLE} characters`);
    setTitleError(null);
    queue({ title: trimmed });
  }

  const statusText: Record<SaveStatus, string> = {
    saved: editable ? `Saved · ${formatTime(savedAt)}` : `Last edited ${formatTime(savedAt)}`,
    unsaved: "Unsaved changes",
    saving: "Saving…",
    error: "Save failed",
    conflict: "Edit conflict",
  };

  return (
    <main className="editor-page">
      <div className="editor-bar">
        <Link href="/docs" className="btn ghost sm" aria-label="Back to documents">
          ←
        </Link>
        <div className="title-wrap">
          <input
            className={`title-input${titleError ? " invalid" : ""}`}
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            onBlur={() => void flush()}
            onKeyDown={(e) => e.key === "Enter" && (e.currentTarget.blur(), editor?.commands.focus())}
            readOnly={!editable}
            maxLength={MAX_TITLE + 20}
            aria-label="Document title"
          />
          <div className="meta small">
            {titleError ? (
              <span className="error-text">{titleError}</span>
            ) : (
              <span className={`status ${status}`} aria-live="polite">
                {statusText[status]}
              </span>
            )}
            <span className="muted">
              {initialDoc.access === "owner"
                ? " · You own this document"
                : ` · Owned by ${initialDoc.ownerName} · ${initialDoc.access === "editor" ? "You can edit" : "View only"}`}
            </span>
          </div>
        </div>
        <button className="btn primary" onClick={() => setShareOpen(true)}>
          {initialDoc.access === "owner" ? "Share" : "People"}
        </button>
      </div>

      {(status === "error" || status === "conflict") && (
        <div className={`banner ${status}`} role="alert">
          <span>{saveError}</span>
          {status === "error" ? (
            <button className="btn sm" onClick={() => void flush()}>
              Retry
            </button>
          ) : (
            <button className="btn sm" onClick={() => location.reload()}>
              Reload latest
            </button>
          )}
        </div>
      )}
      {!editable && (
        <div className="banner info">You have view-only access. Ask {initialDoc.ownerName} for edit access.</div>
      )}

      {editable && editor && <Toolbar editor={editor} />}

      <div className="paper-wrap">
        <article className="paper">
          <EditorContent editor={editor} />
        </article>
      </div>

      {shareOpen && (
        <SharePanel docId={initialDoc.id} isOwner={initialDoc.access === "owner"} ownerName={initialDoc.ownerName} onClose={() => setShareOpen(false)} />
      )}
    </main>
  );
}
