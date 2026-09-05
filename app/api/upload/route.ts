import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const MAX_BYTES = 6 * 1024 * 1024;
const ALLOWED = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
  ["image/heic", "heic"],
]);

/**
 * Stores an item photo. Uses Vercel Blob when BLOB_READ_WRITE_TOKEN is set
 * (the deployed case, since Vercel's filesystem is read-only), and otherwise
 * writes to public/uploads for local development and self-hosting.
 */
export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Only organisers can upload photos." }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file was received." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "That photo is larger than 6 MB." }, { status: 400 });
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

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (blobToken) {
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
      return NextResponse.json({ error: "The photo could not be stored." }, { status: 502 });
    }
    const data = (await response.json()) as { url: string };
    return NextResponse.json({ url: data.url });
  }

  const directory = path.join(process.cwd(), "public", "uploads");
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, filename), bytes);
  return NextResponse.json({ url: `/uploads/${filename}` });
}
