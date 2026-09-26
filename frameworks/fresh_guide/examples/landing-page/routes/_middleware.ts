import { define } from "@/utils/define.ts";

export const handler = define.middleware(async function Middleware(ctx) {
  const sessionId = crypto.randomUUID();

  const resp = await ctx.next();

  resp.headers.set("X-Frame-Options", "DENY");
  resp.headers.set("X-Content-Type-Options", "nosniff");
  resp.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  resp.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains",
  );

  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
  ].join("; ");

  resp.headers.set("Content-Security-Policy", csp);
  resp.headers.set("X-Session-Id", sessionId);

  return resp;
});
