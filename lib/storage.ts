import { randomUUID } from "node:crypto";
import { UTApi } from "uploadthing/server";

// Reads UPLOADTHING_TOKEN from the environment automatically. Callers only
// depend on `saveProofFile` returning a URL — the file itself now lives on
// UploadThing's CDN, not this server, so nothing else needs to change.
const utapi = new UTApi();

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const MAX_BYTES = 8 * 1024 * 1024; // 8MB

export async function saveProofFile(userId: string, file: File): Promise<string> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Unsupported file type. Upload a PNG, JPEG, WEBP, or GIF image.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("File is too large (max 8MB).");
  }

  const ext = file.type.split("/")[1] ?? "bin";
  const named = new File([file], `${userId}-${randomUUID()}.${ext}`, { type: file.type });

  const result = await utapi.uploadFiles(named);
  if (result.error) {
    throw new Error(`Upload failed: ${result.error.message}`);
  }

  return result.data.ufsUrl;
}
