interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  trend?: {
    direction: "up" | "down";
    value: string;
  };
}

export default function StatCard({ icon, label, value, trend }: StatCardProps) {
  return (
    <div class="card bg-base-100 shadow-md border border-base-300">
      <div class="card-body p-5">
        <div class="stat p-0">
          <div class="stat-figure text-primary text-2xl">{icon}</div>
          <div class="stat-title text-base-content/70 text-sm font-medium">
            {label}
          </div>
          <div class="stat-value text-2xl font-bold">{value}</div>
          {trend && (
            <div
              class={`stat-desc flex items-center gap-1 text-sm ${
                trend.direction === "up" ? "text-success" : "text-error"
              }`}
            >
              {trend.direction === "up" ? "▲" : "▼"} {trend.value}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
