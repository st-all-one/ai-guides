import { define, type State } from "@/utils/define.ts";
import { HttpError } from "fresh";

function isProtectedPath(pathname: string, user: State["user"]): boolean {
  if (!user) return false;
  if (user.role === "admin") return false;
  if (user.role === "editor" && pathname.startsWith("/admin/settings")) return true;
  return false;
}

export const handler = define.middleware(async (ctx) => {
  if (!ctx.state.user) {
    const url = new URL(ctx.req.url);
    const loginUrl = `/login?redirect=${encodeURIComponent(url.pathname)}`;
    return new Response(null, {
      status: 302,
      headers: { Location: loginUrl },
    });
  }

  if (isProtectedPath(new URL(ctx.req.url).pathname, ctx.state.user)) {
    throw new HttpError(403, "You do not have permission to access this page.");
  }

  return ctx.next();
});
