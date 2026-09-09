"use client";

import { useState } from "react";
import { resizeImage } from "@/lib/images";

type Props = { initialUrl: string | null };

/**
 * Picks a photo (camera or library on a phone), shrinks it in the browser, uploads it,
 * and stores the resulting URL in a hidden `photoUrl` field for the form to submit.
 */
export function PhotoField({ initialUrl }: Props) {
  const [url, setUrl] = useState(initialUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const blob = await resizeImage(file);
      const body = new FormData();
      body.set("photo", blob, "photo.jpg");
      const response = await fetch("/api/photos", { method: "POST", body });
      const json = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !json.url) throw new Error(json.error ?? "Upload failed");
      setUrl(json.url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">Photo</span>
      <input type="hidden" name="photoUrl" value={url} />
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="Recipe photo" className="max-h-64 w-full max-w-sm rounded object-cover" />
      )}
      <div className="flex items-center gap-3">
        <input
          type="file"
          accept="image/*"
          aria-label="Choose photo"
          disabled={uploading}
          onChange={(e) => upload(e.target.files?.[0])}
          className="text-sm"
        />
        {url && (
          <button type="button" onClick={() => setUrl("")} className="text-sm underline">
            Remove photo
          </button>
        )}
      </div>
      {uploading && <span className="text-sm text-neutral-600">Uploading…</span>}
      {error && (
        <span role="alert" className="text-sm text-red-700">
          {error}
        </span>
      )}
    </div>
  );
}
