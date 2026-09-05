import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { requireCapability } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Vercel caps a function's request body at 4.5 MB and rejects anything larger
 * before our code runs, with a response that isn't JSON. Staying under that
 * means the uploader can always report a proper error instead of the browser's.
 * The client also shrinks photos before sending, so this is a backstop.
 */
const MAX_BYTES = 4 * 1024 * 1024;

const ALLOWED = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
  ["image/heic", "heic"],
]);

/**
 * Stores an item photo. Uses Vercel Blob when BLOB_READ_WRITE_TOKEN is set,
 * and otherwise writes to public/uploads for local development and
 * self-hosting. Every failure returns JSON, so the uploader can explain it.
 */
export async function POST(request: Request) {
  try {
    await requireCapability("items");
  } catch {
    return NextResponse.json(
      { error: "You need cataloger access to upload photos." },
      { status: 403 }
    );
  }

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

  // Vercel's filesystem is read-only, so without Blob storage there is nowhere
  // to put the file. Say so plainly rather than failing on the write.
  if (!blobToken && process.env.VERCEL) {
    return NextResponse.json(
      {
        error:
          "Photo uploads aren't set up yet — this site needs Vercel Blob storage connected. In the meantime you can paste an image link instead.",
      },
      { status: 501 }
    );
  }

  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("file");
  } catch {
    return NextResponse.json(
      { error: "That photo couldn't be read. Please try another one." },
      { status: 400 }
    );
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file was received." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "That photo is too large. Please use one under 4 MB." },
      { status: 413 }
    );
  }

  const extension = ALLOWED.get(file.type);
  if (!extension) {
    return NextResponse.json(
      { error: "Please upload a JPG, PNG, WebP, GIF or HEIC image." },
      { status: 400 }
    );
  }

  const filename = `${Date.now()}-${randomBytes(6).toString("hex")}.${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  if (blobToken) {
    try {
      const response = await fetch(`https://blob.vercel-storage.com/${filename}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${blobToken}`,
          "x-api-version": "7",
          "x-content-type": file.type,
          "x-add-random-suffix": "1",
        },
        body: bytes,
      });
      if (!response.ok) {
        console.error("Blob upload failed:", response.status, await response.text());
        return NextResponse.json(
          { error: "The photo couldn't be stored. Please try again." },
          { status: 502 }
        );
      }
      const data = (await response.json()) as { url: string };
      return NextResponse.json({ url: data.url });
    } catch (error) {
      console.error("Blob upload threw:", error);
      return NextResponse.json(
        { error: "The photo couldn't be stored. Please try again." },
        { status: 502 }
      );
    }
  }

  try {
    const directory = path.join(process.cwd(), "public", "uploads");
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, filename), bytes);
    return NextResponse.json({ url: `/api/uploads/${filename}` });
  } catch (error) {
    console.error("Local upload failed:", error);
    return NextResponse.json(
      { error: "The photo couldn't be saved on the server." },
      { status: 500 }
    );
  }
}
