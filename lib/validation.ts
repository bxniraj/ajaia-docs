import { z } from "zod";

export const MAX_TITLE = 200;
export const MAX_CONTENT_BYTES = 1_000_000; // ~1 MB of HTML
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2 MB

const title = z
  .string()
  .trim()
  .min(1, "Title cannot be empty")
  .max(MAX_TITLE, `Title must be at most ${MAX_TITLE} characters`);

const content = z
  .string()
  .refine((s) => Buffer.byteLength(s, "utf8") <= MAX_CONTENT_BYTES, "Document is too large (1 MB limit)");

export const createDocSchema = z.object({
  title: title.optional(),
  content: content.optional(),
});

export const updateDocSchema = z
  .object({
    title: title.optional(),
    content: content.optional(),
    /** updatedAt the client last saw; used to detect concurrent overwrites. */
    baseUpdatedAt: z.number().int().optional(),
  })
  .refine((v) => v.title !== undefined || v.content !== undefined, "Nothing to update");

export const roleSchema = z.enum(["viewer", "editor"]);

export const shareSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  role: roleSchema.default("editor"),
});

