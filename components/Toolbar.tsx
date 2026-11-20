"use client";

import { useEditorState, type Editor } from "@tiptap/react";

type Btn = { label: React.ReactNode; title: string; active?: boolean; disabled?: boolean; run: () => void };

export default function Toolbar({ editor }: { editor: Editor }) {
  // Subscribe only to the bits of state the toolbar renders.
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      h1: e.isActive("heading", { level: 1 }),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });

  const chain = () => editor.chain().focus();
  const blockValue = s.h1 ? "h1" : s.h2 ? "h2" : s.h3 ? "h3" : "p";

  const groups: Btn[][] = [
    [
      { label: "↶", title: "Undo (Ctrl+Z)", disabled: !s.canUndo, run: () => chain().undo().run() },
      { label: "↷", title: "Redo (Ctrl+Shift+Z)", disabled: !s.canRedo, run: () => chain().redo().run() },
    ],
    [
      { label: <b>B</b>, title: "Bold (Ctrl+B)", active: s.bold, run: () => chain().toggleBold().run() },
      { label: <i>I</i>, title: "Italic (Ctrl+I)", active: s.italic, run: () => chain().toggleItalic().run() },
      { label: <u>U</u>, title: "Underline (Ctrl+U)", active: s.underline, run: () => chain().toggleUnderline().run() },
      { label: <s>S</s>, title: "Strikethrough", active: s.strike, run: () => chain().toggleStrike().run() },
    ],
    [
      { label: "• List", title: "Bulleted list", active: s.bullet, run: () => chain().toggleBulletList().run() },
      { label: "1. List", title: "Numbered list", active: s.ordered, run: () => chain().toggleOrderedList().run() },
      { label: "❝", title: "Quote", active: s.quote, run: () => chain().toggleBlockquote().run() },
    ],
  ];

  return (
    <div className="toolbar" role="toolbar" aria-label="Formatting">
      {groups.slice(0, 1).map(renderGroup)}
      <select
        className="block-select"
        aria-label="Text style"
        value={blockValue}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "p") chain().setParagraph().run();
          else chain().setHeading({ level: Number(v[1]) as 1 | 2 | 3 }).run();
        }}
      >
        <option value="p">Normal text</option>
        <option value="h1">Heading 1</option>
        <option value="h2">Heading 2</option>
        <option value="h3">Heading 3</option>
      </select>
      {groups.slice(1).map(renderGroup)}
    </div>
  );
}

function renderGroup(group: Btn[], i: number) {
  return (
    <div className="tb-group" key={i}>
      {group.map((b) => (
        <button
          key={b.title}
          type="button"
          className={`tb-btn${b.active ? " active" : ""}`}
          title={b.title}
          aria-label={b.title}
          aria-pressed={b.active}
          disabled={b.disabled}
          // Keep the editor selection when clicking toolbar buttons.
          onMouseDown={(e) => e.preventDefault()}
          onClick={b.run}
        >
          {b.label}
        </button>
      ))}
    </div>
  );
}
