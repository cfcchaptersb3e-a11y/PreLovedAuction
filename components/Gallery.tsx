"use client";

import { useState } from "react";

/**
 * A photo keeps its own shape here: an item shot taken in portrait stands
 * portrait instead of being cropped into a landscape frame. The frame follows
 * the photo between these bounds, and anything more extreme — a panorama, a
 * very tall shot — is shown whole inside the nearest one.
 */
const WIDEST = 4 / 3;
const TALLEST = 3 / 4;

export function Gallery({ images, title }: { images: string[]; title: string }) {
  const [active, setActive] = useState(0);
  const [ratios, setRatios] = useState<Record<string, number>>({});

  function remember(url: string, image: HTMLImageElement) {
    const shape = image.naturalWidth / image.naturalHeight;
    if (!Number.isFinite(shape) || shape <= 0) return;
    const bounded = Math.min(WIDEST, Math.max(TALLEST, shape));
    setRatios((known) => (known[url] === bounded ? known : { ...known, [url]: bounded }));
  }

  if (images.length === 0) {
    return (
      <div className="grid aspect-[4/3] place-items-center rounded-2xl border border-line bg-parchment text-5xl text-muted/40">
        <span aria-hidden>🎁</span>
        <span className="sr-only">No photo provided for {title}</span>
      </div>
    );
  }

  const current = images[active];

  return (
    <div>
      {/* The frame is sized from the photo once it has loaded; until then it
          holds the landscape shape most item photos have, so the page below
          it does not jump about. */}
      <div
        className="flex max-h-[70vh] items-center justify-center overflow-hidden rounded-2xl border border-line bg-parchment"
        style={{ aspectRatio: ratios[current] ?? WIDEST }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current}
          alt={`${title} — photo ${active + 1} of ${images.length}`}
          onLoad={(event) => remember(current, event.currentTarget)}
          className="h-full w-full object-contain"
        />
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {images.map((url, index) => (
            <button
              key={url}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Show photo ${index + 1}`}
              aria-current={index === active}
              className={`h-16 w-16 overflow-hidden rounded-lg border-2 bg-parchment transition ${
                index === active ? "border-forest" : "border-line hover:border-muted"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-contain" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
