import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card mx-auto max-w-md p-10 text-center">
      <p className="text-4xl" aria-hidden>
        🔎
      </p>
      <h1 className="mt-3 text-xl font-bold">We couldn&rsquo;t find that page</h1>
      <p className="mt-2 text-muted">
        The item may have been withdrawn, or the link may be out of date.
      </p>
      <Link href="/" className="btn-primary mt-6">
        Back to the auction
      </Link>
    </div>
  );
}
