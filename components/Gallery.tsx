"use client";

import { useState } from "react";

export function Gallery({ images, title }: { images: string[]; title: string }) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div className="grid aspect-[4/3] place-items-center rounded-2xl border border-line bg-parchment text-5xl text-muted/40">
        <span aria-hidden>🎁</span>
        <span className="sr-only">No photo provided for {title}</span>
      </div>
    );
  }

  return (
    <div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={images[active]}
        alt={`${title} — photo ${active + 1} of ${images.length}`}
        className="aspect-[4/3] w-full rounded-2xl border border-line bg-parchment object-cover"
      />
      {images.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {images.map((url, index) => (
            <button
              key={url}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Show photo ${index + 1}`}
              aria-current={index === active}
              className={`h-16 w-16 overflow-hidden rounded-lg border-2 transition ${
                index === active ? "border-forest" : "border-line hover:border-muted"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
