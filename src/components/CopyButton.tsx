"use client";

import { useState } from "react";

type Props = { text: string; label: string; className?: string };

/** Copies `text` to the clipboard and confirms briefly. */
export function CopyButton({ text, label, className }: Props) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
    setTimeout(() => setState("idle"), 2500);
  };

  return (
    <span className="inline-flex items-center gap-3">
      <button
        type="button"
        onClick={copy}
        className={className ?? "rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white"}
      >
        {label}
      </button>
      {state !== "idle" && (
        <span role="status" className={`text-sm ${state === "copied" ? "text-green-700" : "text-red-700"}`}>
          {state === "copied" ? "Copied" : "Couldn't copy. Select the text and copy it instead."}
        </span>
      )}
    </span>
  );
}
