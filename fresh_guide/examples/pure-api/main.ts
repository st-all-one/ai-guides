import { App, cors, type MiddlewareFn } from "fresh";

const securityHeaders: MiddlewareFn = async (ctx) => {
  const resp = await ctx.next();
  resp.headers.set("X-Content-Type-Options", "nosniff");
  resp.headers.set("X-Frame-Options", "DENY");
  resp.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  resp.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  return resp;
};

export const app = new App({ basePath: "" })
  .use(securityHeaders)
  .use(cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-API-Key"],
    exposeHeaders: [
      "X-Total-Count",
      "X-Page",
      "X-Per-Page",
      "X-Rate-Limit-Remaining",
    ],
    credentials: false,
    maxAge: 86400,
  }))
  .fsRoutes();
