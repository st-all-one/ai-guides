import { App, staticFiles, csrf, csp, trailingSlashes } from "fresh";
import type { State } from "@/utils/define.ts";

export const app = new App<State>({ trustProxy: true })
  .use(staticFiles())
  .use(csrf())
  .use(csp({ useNonce: true }))
  .use(trailingSlashes("never"))
  .use(async (ctx) => {
    const cookie = ctx.req.headers.get("cookie") || "";
    const sessionMatch = cookie.match(/session=([^;]+)/);
    if (sessionMatch) {
      const sessionId = sessionMatch[1];
      const sessions: Record<string, State["user"]> = {
        "admin-session": { id: "1", name: "Admin User", email: "admin@example.com", role: "admin" },
        "editor-session": { id: "2", name: "Editor User", email: "editor@example.com", role: "editor" },
        "viewer-session": { id: "3", name: "Viewer User", email: "viewer@example.com", role: "viewer" },
      };
      ctx.state.user = sessions[sessionId];
    }
    return ctx.next();
  })
  .fsRoutes();
