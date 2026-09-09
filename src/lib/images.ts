/** Largest edge a recipe photo is stored at. Phone photos are far bigger than needed. */
export const MAX_PHOTO_EDGE = 1600;

/** Scales a size down so neither edge exceeds `max`, keeping the aspect ratio. */
export function fitWithin(width: number, height: number, max: number): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= max) return { width, height };
  const scale = max / longest;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/**
 * Browser only. Draws the image onto a canvas at a reduced size and returns it as a
 * JPEG blob. Uses the image's own orientation data so phone photos come out upright.
 */
export async function resizeImage(file: File, max = MAX_PHOTO_EDGE): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height, max);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not get a canvas context");
    context.drawImage(bitmap, 0, 0, width, height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Could not encode the image"))),
        "image/jpeg",
        0.85,
      );
    });
  } finally {
    bitmap.close();
  }
}
