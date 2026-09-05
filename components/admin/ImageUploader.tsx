"use client";

import { useRef, useState } from "react";

/**
 * Photos can be uploaded from a phone or pasted in as links. Uploads go to
 * whatever storage the deployment has configured (Vercel Blob, or the local
 * public/uploads folder when self-hosting).
 */
export function ImageUploader({
  value,
  onChange,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(null);

    const uploaded: string[] = [];
    for (const file of Array.from(files).slice(0, 8 - value.length)) {
      const body = new FormData();
      body.append("file", file);
      try {
        const response = await fetch("/api/upload", { method: "POST", body });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Upload failed");
        uploaded.push(data.url);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Upload failed");
      }
    }

    onChange([...value, ...uploaded].slice(0, 8));
    if (fileInput.current) fileInput.current.value = "";
    setBusy(false);
  }

  function addLink() {
    const url = link.trim();
    if (!/^https?:\/\//.test(url)) {
      setError("Paste a link that starts with http:// or https://");
      return;
    }
    setError(null);
    onChange([...value, url].slice(0, 8));
    setLink("");
  }

  return (
    <div>
      <span className="label">Photos</span>

      {value.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {value.map((url, index) => (
            <div key={`${url}-${index}`} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Photo ${index + 1}`}
                className="h-20 w-20 rounded-lg border border-line object-cover"
              />
              <button
                type="button"
                aria-label={`Remove photo ${index + 1}`}
                onClick={() => onChange(value.filter((_, i) => i !== index))}
                className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-ink text-xs text-white"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          disabled={busy || value.length >= 8}
          onChange={(event) => upload(event.target.files)}
          className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-forest file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
        />
        {busy && <span className="text-sm text-muted">Uploading…</span>}
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        <input
          value={link}
          onChange={(event) => setLink(event.target.value)}
          placeholder="…or paste an image link"
          className="field max-w-xs flex-1"
        />
        <button type="button" className="btn-secondary btn-sm" onClick={addLink}>
          Add link
        </button>
      </div>

      <p className="hint">Up to 8 photos. The first one is used as the item&rsquo;s cover.</p>
      {error && <p className="mt-1 text-xs text-clay">{error}</p>}
    </div>
  );
}
