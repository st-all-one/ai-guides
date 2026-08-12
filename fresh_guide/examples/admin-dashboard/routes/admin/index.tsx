import { define } from "@/utils/define.ts";
import PageHeader from "@/components/PageHeader.tsx";
import DashboardStats from "@/islands/DashboardStats.tsx";
import StatCard from "@/components/StatCard.tsx";

export const handler = define.handlers({
  GET(ctx) {
    return ctx.render({
      stats: {
        totalUsers: 1248,
        activeUsers: 342,
        revenue: 48250,
        orders: 1563,
      },
      recentActivity: [
        { id: "1", action: "User created", user: "John Smith", time: "2 min ago" },
        { id: "2", action: "Order placed", user: "Jane Doe", time: "15 min ago" },
        { id: "3", action: "Settings updated", user: "Admin User", time: "1 hour ago" },
        { id: "4", action: "User deleted", user: "Bob Johnson", time: "2 hours ago" },
        { id: "5", action: "Password changed", user: "Alice Brown", time: "3 hours ago" },
      ],
    });
  },
});

export default define.page<typeof handler>(function AdminDashboard({ data }) {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Overview of your application metrics."
      />

      <DashboardStats initial={data.stats} />

      <div class="card bg-base-100 shadow-md border border-base-300">
        <div class="card-body">
          <h2 class="card-title text-lg mb-2">Recent Activity</h2>
          <div class="overflow-x-auto">
            <table class="table table-sm" aria-label="Recent activity">
              <thead>
                <tr>
                  <th scope="col">Action</th>
                  <th scope="col">User</th>
                  <th scope="col">Time</th>
                </tr>
              </thead>
              <tbody>
                {data.recentActivity.map((item) => (
                  <tr key={item.id}>
                    <td>{item.action}</td>
                    <td>{item.user}</td>
                    <td class="text-base-content/60">{item.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
});
