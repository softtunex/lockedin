export default function GoalsLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-32 rounded bg-muted" />
          <div className="h-4 w-56 rounded bg-muted" />
        </div>
        <div className="h-9 w-32 rounded-md bg-muted" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 w-full rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  );
}
