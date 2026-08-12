import { useSignal, useEffect } from "preact/hooks";
import StatCard from "@/components/StatCard.tsx";

interface Stats {
  totalUsers: number;
  activeUsers: number;
  revenue: number;
  orders: number;
}

export default function DashboardStats(
  { initial }: { initial: Stats },
) {
  const stats = useSignal<Stats>(initial);
  const loading = useSignal(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      loading.value = false;
    }, 1500);

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/admin/api/stats");
        if (res.ok) {
          const data = await res.json();
          stats.value = data;
        }
      } catch {
        const prev = stats.value;
        stats.value = {
          totalUsers: prev.totalUsers + Math.floor(Math.random() * 3),
          activeUsers: Math.max(
            0,
            prev.activeUsers + Math.floor(Math.random() * 5) - 2,
          ),
          revenue: prev.revenue + Math.floor(Math.random() * 200),
          orders: prev.orders + Math.floor(Math.random() * 3),
        };
      }
    }, 5000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const s = stats.value;

  return (
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div class={loading.value ? "animate-pulse" : ""}>
        <StatCard
          icon="👥"
          label="Total Users"
          value={s.totalUsers.toLocaleString()}
          trend={{ direction: "up", value: "+12% this month" }}
        />
      </div>
      <div class={loading.value ? "animate-pulse" : ""}>
        <StatCard
          icon="🟢"
          label="Active Users"
          value={s.activeUsers.toLocaleString()}
          trend={{ direction: "up", value: "+8% this week" }}
        />
      </div>
      <div class={loading.value ? "animate-pulse" : ""}>
        <StatCard
          icon="💰"
          label="Revenue"
          value={`$${s.revenue.toLocaleString()}`}
          trend={{ direction: "up", value: "+23% this month" }}
        />
      </div>
      <div class={loading.value ? "animate-pulse" : ""}>
        <StatCard
          icon="📦"
          label="Orders"
          value={s.orders.toLocaleString()}
          trend={{ direction: "down", value: "-3% this week" }}
        />
      </div>
    </div>
  );
}
