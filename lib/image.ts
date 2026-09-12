/**
 * Shrinks a photo in the browser before it is uploaded.
 *
 * Phones routinely produce 3-5 MB images, and Vercel rejects any request body
 * over 4.5 MB before the app sees it. Resizing here keeps uploads well under
 * that, makes them quick on mobile data, and keeps item pages light for
 * bidders. If the browser can't decode the image (an exotic HEIC, say) the
 * original file is returned and the server decides what to do with it.
 *
 * The photo is decoded through an <img> element rather than createImageBitmap
 * so that the camera's EXIF orientation is applied before it is redrawn: a
 * phone stores an upright shot as landscape pixels plus a "rotate me" tag, and
 * a decode that ignores the tag bakes a portrait photo into a landscape file.
 */

const MAX_EDGE = 1600;
const QUALITY = 0.85;
/** Files at or below this are already small enough to send untouched. */
const SKIP_BELOW_BYTES = 400 * 1024;

export async function shrinkImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  if (typeof document === "undefined") return file;

  const source = URL.createObjectURL(file);

  try {
    const image = await decode(source);

    // These are the dimensions as the photo is meant to be seen — the browser
    // has already applied the EXIF rotation, so a portrait shot reads taller
    // than it is wide here, and drawing it below keeps it that way.
    const longestEdge = Math.max(image.naturalWidth, image.naturalHeight);
    const scale = Math.min(1, MAX_EDGE / longestEdge);
    if (scale === 1 && file.size <= SKIP_BELOW_BYTES) return file;

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", QUALITY)
    );
    if (!blob || blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${name}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(source);
  }
}

function decode(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The photo could not be decoded."));
    image.src = source;
  });
}
