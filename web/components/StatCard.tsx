import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  sublabel,
  icon: Icon,
}: {
  label: string;
  value: string;
  sublabel?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between mb-1">
        <div className="text-sm text-muted">{label}</div>
        {Icon && (
          <div className="w-7 h-7 rounded-md bg-accent-dim border border-accent/30 flex items-center justify-center text-accent shrink-0">
            <Icon size={14} />
          </div>
        )}
      </div>
      <div className="text-2xl font-semibold">{value}</div>
      {sublabel && <div className="text-xs text-accent mt-1">{sublabel}</div>}
    </div>
  );
}
