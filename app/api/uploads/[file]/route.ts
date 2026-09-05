import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

/**
 * Serves a locally-stored item photo.
 *
 * Files written into `public/` after the build are not picked up by Next's
 * production server, so self-hosted uploads have to be read back explicitly.
 * On Vercel this route is unused: photos live in Blob storage and are served
 * from their own absolute URLs.
 */

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
};

/** Exactly the shape the upload route generates — nothing else is readable. */
const FILENAME = /^\d{10,}-[0-9a-f]{12}\.(jpg|png|webp|gif|heic)$/;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> }
) {
  const { file } = await params;
  if (!FILENAME.test(file)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  try {
    const bytes = await readFile(path.join(process.cwd(), "public", "uploads", file));
    const extension = file.split(".").pop()!;
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": CONTENT_TYPES[extension] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
}
