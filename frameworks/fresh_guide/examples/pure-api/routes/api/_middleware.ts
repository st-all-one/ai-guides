import { define } from "../../../utils/define.ts";
import { ApiError } from "../../../utils/errors.ts";

const limits = new Map<
  string,
  { count: number; resetAt: number }
>();

const MAX_REQUESTS = 100;
const WINDOW_MS = 60_000;

function getLimit(ip: string) {
  const now = Date.now();
  let entry = limits.get(ip);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + WINDOW_MS };
    limits.set(ip, entry);
  }
  return entry;
}

export const handler = define.handlers({
  async GET(ctx) {
    return await process(ctx);
  },
  async POST(ctx) {
    return await process(ctx);
  },
  async PUT(ctx) {
    return await process(ctx);
  },
  async PATCH(ctx) {
    return await process(ctx);
  },
  async DELETE(ctx) {
    return await process(ctx);
  },
  async OPTIONS(ctx) {
    return await process(ctx);
  },
});

async function process(ctx: Parameters<typeof handler.GET>[0]): Promise<Response> {
  const url = new URL(ctx.req.url);
  const start = performance.now();

  const forwarded = ctx.req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ??
    ctx.req.headers.get("x-real-ip") ?? "127.0.0.1";

  const entry = getLimit(ip);
  entry.count++;

  const remaining = Math.max(0, MAX_REQUESTS - entry.count);
  const resetIn = Math.max(0, Math.ceil((entry.resetAt - Date.now()) / 1000));

  if (entry.count > MAX_REQUESTS) {
    const resp = ApiError.rateLimit(resetIn, url.pathname).toResponse();
    resp.headers.set("Retry-After", String(resetIn));
    resp.headers.set("X-Rate-Limit-Remaining", "0");
    resp.headers.set("X-Rate-Limit-Reset", String(resetIn));
    return resp;
  }

  const method = ctx.req.method;
  if (
    ["POST", "PUT", "PATCH"].includes(method) &&
    !url.pathname.endsWith("/avatar")
  ) {
    const ct = ctx.req.headers.get("content-type");
    if (!ct || !ct.includes("application/json")) {
      const resp = new ApiError(
        415,
        "https://api.example.com/problems/unsupported-media-type",
        "Unsupported Media Type",
        "Content-Type must be application/json",
        url.pathname,
      ).toResponse();
      resp.headers.set("X-Rate-Limit-Remaining", String(remaining));
      resp.headers.set("X-Rate-Limit-Reset", String(resetIn));
      return resp;
    }
  }

  let resp: Response;
  try {
    resp = await ctx.next();
  } catch (err) {
    if (err instanceof ApiError) {
      resp = err.toResponse();
    } else {
      console.error("Unhandled error:", err);
      resp = new ApiError(
        500,
        "https://api.example.com/problems/internal-error",
        "Internal Server Error",
        "An unexpected error occurred",
        url.pathname,
      ).toResponse();
    }
  }

  const duration = Math.round(performance.now() - start);
  console.log(
    `[${new Date().toISOString()}] ${method} ${url.pathname} ${resp.status} ${duration}ms ip=${ip} remaining=${remaining}`,
  );

  resp.headers.set("X-Rate-Limit-Remaining", String(remaining));
  resp.headers.set("X-Rate-Limit-Reset", String(resetIn));
  return resp;
}
