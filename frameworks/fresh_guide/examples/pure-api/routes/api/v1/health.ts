import { define } from "../../../utils/define.ts";

const startTime = Date.now();

export const handler = define.handlers({
  GET(_ctx) {
    return Response.json(
      {
        status: "ok",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
        uptime: Date.now() - startTime,
      },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  },
});
