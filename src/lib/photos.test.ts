// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { savePhoto, readPhoto, isSafePhotoName, photoContentType, PhotoError } from "./photos";

let dir: string;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "meal-prep-photos-"));
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("savePhoto", () => {
  it("writes the bytes under a generated name with the right extension", () => {
    const name = savePhoto(new Uint8Array([1, 2, 3]), "image/jpeg", dir);
    expect(name).toMatch(/^[a-f0-9-]{36}\.jpg$/);
    expect(fs.readFileSync(path.join(dir, name))).toEqual(Buffer.from([1, 2, 3]));
  });

  it("creates the directory if needed", () => {
    const nested = path.join(dir, "a", "b");
    const name = savePhoto(new Uint8Array([9]), "image/png", nested);
    expect(fs.existsSync(path.join(nested, name))).toBe(true);
    expect(name.endsWith(".png")).toBe(true);
  });

  it("accepts webp and refuses anything else", () => {
    expect(savePhoto(new Uint8Array([1]), "image/webp", dir)).toMatch(/\.webp$/);
    expect(() => savePhoto(new Uint8Array([1]), "image/gif", dir)).toThrow(PhotoError);
    expect(() => savePhoto(new Uint8Array([1]), "text/html", dir)).toThrow(PhotoError);
  });

  it("refuses an empty file", () => {
    expect(() => savePhoto(new Uint8Array([]), "image/jpeg", dir)).toThrow(PhotoError);
  });
});

describe("readPhoto", () => {
  it("returns the bytes for a saved photo and undefined for a missing one", () => {
    const name = savePhoto(new Uint8Array([4, 5]), "image/jpeg", dir);
    expect(readPhoto(name, dir)).toEqual(Buffer.from([4, 5]));
    expect(readPhoto("00000000-0000-0000-0000-000000000000.jpg", dir)).toBeUndefined();
  });

  it("refuses names that could escape the directory", () => {
    expect(() => readPhoto("../etc/passwd", dir)).toThrow(PhotoError);
    expect(() => readPhoto("..%2Fx.jpg", dir)).toThrow(PhotoError);
  });
});

describe("isSafePhotoName / photoContentType", () => {
  it("only accepts generated-looking names", () => {
    expect(isSafePhotoName("3f2a1b4c-0000-4000-8000-000000000000.jpg")).toBe(true);
    expect(isSafePhotoName("3f2a1b4c-0000-4000-8000-000000000000.webp")).toBe(true);
    expect(isSafePhotoName("photo.jpg")).toBe(false);
    expect(isSafePhotoName("../x.jpg")).toBe(false);
    expect(isSafePhotoName("")).toBe(false);
  });

  it("maps extensions to content types", () => {
    expect(photoContentType("a.jpg")).toBe("image/jpeg");
    expect(photoContentType("a.png")).toBe("image/png");
    expect(photoContentType("a.webp")).toBe("image/webp");
    expect(photoContentType("a.gif")).toBeUndefined();
  });
});
