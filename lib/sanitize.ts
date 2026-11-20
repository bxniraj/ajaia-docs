import sanitizeHtml from "sanitize-html";

/**
 * Whitelist matches what the editor can represent. Anything else (scripts, styles,
 * event handlers, images, tables) is dropped before it reaches the database.
 */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "strong", "b", "em", "i", "u", "s", "code", "pre",
    "h1", "h2", "h3", "ul", "ol", "li", "blockquote", "hr", "a",
  ],
  allowedAttributes: { a: ["href", "target", "rel"], ol: ["start"] },
  allowedSchemes: ["http", "https", "mailto"],
  // Map heading levels the editor does not offer down to h3.
  transformTags: { h4: "h3", h5: "h3", h6: "h3" },
};

export function sanitizeContent(html: string): string {
  return sanitizeHtml(html, OPTIONS);
}
