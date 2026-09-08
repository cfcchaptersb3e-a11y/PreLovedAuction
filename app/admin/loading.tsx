/**
 * Shown the instant an organizer taps a tab.
 *
 * Every page in here is rendered fresh on each visit, so a tap means a round
 * trip to the server. Without this file Next keeps the previous page on screen
 * for the whole of it, so the tap looks like it did nothing and people tap
 * again. It also gives `<Link>` something to prefetch, which it cannot do for a
 * dynamic page otherwise.
 */
export default function AdminLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <div className="h-5 w-40 animate-pulse rounded bg-parchment" />
      {[0, 1, 2].map((row) => (
        <div key={row} className="card space-y-3 p-5">
          <div className="h-4 w-1/3 animate-pulse rounded bg-parchment" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-parchment" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-parchment" />
        </div>
      ))}
    </div>
  );
}
