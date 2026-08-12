import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

// Local filesystem stub for proof-of-work images. Swap this file for an
// Uploadthing (or Supabase Storage / Cloudinary) implementation in
// production — callers only depend on `saveProofFile` returning a URL and
// `getProofFileAbsolutePath` resolving one back to disk, so no other code
// needs to change.
const UPLOAD_ROOT = path.join(process.cwd(), "storage", "uploads");
const PUBLIC_PREFIX = "/api/uploads";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const MAX_BYTES = 8 * 1024 * 1024; // 8MB

export async function saveProofFile(userId: string, file: File): Promise<string> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Unsupported file type. Upload a PNG, JPEG, WEBP, or GIF image.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("File is too large (max 8MB).");
  }

  const userDir = path.join(UPLOAD_ROOT, userId);
  await mkdir(userDir, { recursive: true });

  const ext = file.type.split("/")[1] ?? "bin";
  const filename = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(userDir, filename), buffer);

  return `${PUBLIC_PREFIX}/${userId}/${filename}`;
}

export function resolveProofFilePath(segments: string[]): string {
  const safeSegments = segments.filter((s) => s !== ".." && s !== "." && s.length > 0);
  return path.join(UPLOAD_ROOT, ...safeSegments);
}
