export default function HistoryLoading() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="space-y-2">
        <div className="h-8 w-32 rounded bg-muted" />
        <div className="h-4 w-64 rounded bg-muted" />
      </div>
      <div className="h-96 w-full rounded-lg bg-muted" />
    </div>
  );
}
