"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="card mx-auto max-w-md p-10 text-center">
      <p className="text-4xl" aria-hidden>
        😕
      </p>
      <h1 className="mt-3 text-xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-muted">
        Sorry about that. Try again — if it keeps happening, let a chapter organiser know.
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <button type="button" onClick={reset} className="btn-primary">
          Try again
        </button>
        <Link href="/" className="btn-secondary">
          Back to the auction
        </Link>
      </div>
    </div>
  );
}
