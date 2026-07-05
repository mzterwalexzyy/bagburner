export function StatCard({ label, value, sublabel }: { label: string; value: string; sublabel?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="text-sm text-muted mb-1">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
      {sublabel && <div className="text-xs text-accent mt-1">{sublabel}</div>}
    </div>
  );
}
