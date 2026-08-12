import { define } from "@/utils/define.ts";

export const handler = define.handlers({
  GET(_ctx) {
    const baseUsers = 1248;
    const baseActive = 342;
    const baseRevenue = 48250;
    const baseOrders = 1563;

    const totalUsers = baseUsers + Math.floor(Math.random() * 10);
    const activeUsers = baseActive + Math.floor(Math.random() * 20) - 10;
    const revenue = baseRevenue + Math.floor(Math.random() * 500);
    const orders = baseOrders + Math.floor(Math.random() * 5);

    return Response.json({
      totalUsers,
      activeUsers: Math.max(0, activeUsers),
      revenue,
      orders,
    });
  },
});
