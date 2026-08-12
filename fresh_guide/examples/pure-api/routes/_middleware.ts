import { define } from "../../utils/define.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const url = new URL(ctx.req.url);
    const start = performance.now();
    const requestId = crypto.randomUUID();
    ctx.state.requestId = requestId;

    const resp = await ctx.next();
    const duration = Math.round(performance.now() - start);

    resp.headers.set("X-Request-Id", requestId);
    resp.headers.set("X-Response-Time", `${duration}ms`);

    const timing = `total;dur=${duration}`;
    const existing = resp.headers.get("Server-Timing");
    resp.headers.set(
      "Server-Timing",
      existing ? `${existing}, ${timing}` : timing,
    );

    return resp;
  },
});
