"use client";

export function PrintButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={className ?? "rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white print:hidden"}
    >
      Print
    </button>
  );
}
