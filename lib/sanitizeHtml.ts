import sanitizeHtml from "sanitize-html";

/**
 * Allowlist matches exactly what the RichTextEditor toolbar can produce
 * (bold, italic, highlight, bullet/numbered lists). Server-side only - call
 * this before writing any admin-authored explanation HTML to the database.
 */
export function sanitizeExplanationHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ["p", "strong", "em", "mark", "ul", "ol", "li", "br"],
    allowedAttributes: {},
  }).trim();
}
