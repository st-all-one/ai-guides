import { define } from "@/utils/define.ts";

export const handler = define.handlers({
  GET(ctx) {
    if (ctx.state.user) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/admin" },
      });
    }
    return new Response(null, {
      status: 302,
      headers: { Location: "/login" },
    });
  },
});

export default define.page<typeof handler>(function Index() {
  return null;
});
