export default function FeedLoading() {
  return (
    <div className="mx-auto max-w-xl animate-pulse space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-40 rounded bg-muted" />
        <div className="h-4 w-72 rounded bg-muted" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 w-full rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  );
}
