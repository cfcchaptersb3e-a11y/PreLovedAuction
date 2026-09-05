/**
 * Shrinks a photo in the browser before it is uploaded.
 *
 * Phones routinely produce 3-5 MB images, and Vercel rejects any request body
 * over 4.5 MB before the app sees it. Resizing here keeps uploads well under
 * that, makes them quick on mobile data, and keeps item pages light for
 * bidders. If the browser can't decode the image (an exotic HEIC, say) the
 * original file is returned and the server decides what to do with it.
 */

const MAX_EDGE = 1600;
const QUALITY = 0.85;
/** Files at or below this are already small enough to send untouched. */
const SKIP_BELOW_BYTES = 400 * 1024;

export async function shrinkImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  if (typeof createImageBitmap !== "function") return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  try {
    const longestEdge = Math.max(bitmap.width, bitmap.height);
    const scale = Math.min(1, MAX_EDGE / longestEdge);
    if (scale === 1 && file.size <= SKIP_BELOW_BYTES) return file;

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));

    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", QUALITY)
    );
    if (!blob || blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${name}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  } finally {
    bitmap.close?.();
  }
}
