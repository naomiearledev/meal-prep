import fs from "node:fs";
import path from "node:path";

/** Recipe photos live beside the database so `data/` is the whole backup. */
export const uploadsDir = process.env.UPLOADS_DIR ?? "data/uploads";

export class PhotoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PhotoError";
  }
}

const EXTENSION_FOR: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const CONTENT_TYPE_FOR: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

const SAFE_NAME = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.(jpg|png|webp)$/;

/** Only names this module generated are ever read back, so nothing can escape the directory. */
export function isSafePhotoName(name: string): boolean {
  return SAFE_NAME.test(name);
}

export function photoContentType(name: string): string | undefined {
  return CONTENT_TYPE_FOR[name.split(".").pop() ?? ""];
}

/** Writes the photo and returns its generated file name. */
export function savePhoto(bytes: Uint8Array, contentType: string, dir = uploadsDir): string {
  const extension = EXTENSION_FOR[contentType];
  if (!extension) throw new PhotoError("Photos must be JPEG, PNG or WebP");
  if (bytes.byteLength === 0) throw new PhotoError("The photo is empty");

  fs.mkdirSync(dir, { recursive: true });
  const name = `${crypto.randomUUID()}.${extension}`;
  fs.writeFileSync(path.join(dir, name), bytes);
  return name;
}

export function readPhoto(name: string, dir = uploadsDir): Buffer | undefined {
  if (!isSafePhotoName(name)) throw new PhotoError("Not a photo name");
  const file = path.join(dir, name);
  return fs.existsSync(file) ? fs.readFileSync(file) : undefined;
}
