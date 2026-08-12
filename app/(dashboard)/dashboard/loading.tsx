export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse">
      <div className="mb-6 flex items-center justify-between border-b border-border pb-6">
        <div className="space-y-2">
          <div className="h-3 w-40 rounded bg-muted" />
          <div className="h-9 w-56 rounded bg-muted" />
        </div>
        <div className="h-10 w-40 rounded bg-muted" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-2">
          <div className="h-10 w-full rounded-md bg-muted" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 w-full rounded-lg bg-muted" />
          ))}
        </div>
        <div className="space-y-4">
          <div className="h-40 w-full rounded-lg bg-muted" />
          <div className="h-32 w-full rounded-lg bg-muted" />
        </div>
      </div>
    </div>
  );
}
