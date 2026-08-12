import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { auth } from "@/lib/auth";
import { resolveProofFilePath } from "@/lib/storage";

const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { path: segments } = await params;
  const filePath = resolveProofFilePath(segments);
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";

  try {
    const data = await readFile(filePath);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream",
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
