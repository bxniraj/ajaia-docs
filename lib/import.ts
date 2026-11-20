import mammoth from "mammoth";
import { marked } from "marked";
import { AppError } from "./errors";
import { sanitizeContent } from "./sanitize";
import { MAX_UPLOAD_BYTES } from "./validation";

export const SUPPORTED_EXTENSIONS = [".txt", ".md", ".markdown", ".docx"] as const;

function extensionOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i).toLowerCase();
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Plain text: blank lines separate paragraphs, single newlines become <br>. */
export function textToHtml(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/**
 * Convert an uploaded file into sanitized editor HTML plus a suggested title.
 * Throws a 400/413 AppError for unsupported, empty or oversized files.
 */
export async function fileToDocument(fileName: string, data: Buffer): Promise<{ title: string; html: string }> {
  const ext = extensionOf(fileName);
  if (!(SUPPORTED_EXTENSIONS as readonly string[]).includes(ext)) {
    throw new AppError(400, `Unsupported file type "${ext || "none"}". Use .txt, .md or .docx.`);
  }
  if (data.length === 0) throw new AppError(400, "The file is empty");
  if (data.length > MAX_UPLOAD_BYTES) throw new AppError(413, "File is larger than the 2 MB limit");

  let html: string;
  if (ext === ".docx") {
    try {
      // Mammoth drops underline by default; map it explicitly.
      const result = await mammoth.convertToHtml({ buffer: data }, { styleMap: ["u => u"] });
      html = result.value;
    } catch {
      throw new AppError(400, "Could not read that .docx file. Is it a valid Word document?");
    }
  } else {
    const text = data.toString("utf8");
    html = ext === ".txt" ? textToHtml(text) : await marked.parse(text, { gfm: true });
  }

  const clean = sanitizeContent(html);
  if (!clean.trim()) throw new AppError(400, "No readable content found in the file");

  const base = fileName.slice(0, fileName.length - ext.length).trim() || "Imported document";
  return { title: base.slice(0, 200), html: clean };
}
