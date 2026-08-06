"use client";

import { useState } from "react";

interface LightboxProps {
  src: string;
  alt: string;
  className?: string;
}

/** Click-to-enlarge image with a download button, used anywhere challenge or
 * explanation media is shown. */
export default function Lightbox({ src, alt, className }: LightboxProps) {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  async function handleDownload(e: React.MouseEvent) {
    e.stopPropagation();
    setDownloading(true);
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = src.split("/").pop() ?? "image";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      // Cross-origin/network hiccup - fall back to just opening the image.
      window.open(src, "_blank");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block cursor-zoom-in border-0 bg-transparent p-0"
        aria-label={`Enlarge image: ${alt}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className={className} />
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 p-6"
          onClick={() => setOpen(false)}
        >
          <div className="absolute right-4 top-4 flex gap-2">
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="rounded-md bg-white/90 px-3 py-1.5 text-sm font-medium text-gray-900 hover:bg-white disabled:opacity-50"
            >
              {downloading ? "Downloading..." : "⬇ Download"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md bg-white/90 px-3 py-1.5 text-sm font-medium text-gray-900 hover:bg-white"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="max-h-full max-w-full rounded-md object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </>
  );
}
