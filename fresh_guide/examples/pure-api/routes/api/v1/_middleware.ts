import { define } from "../../../utils/define.ts";

export const handler = define.handlers({
  async GET(ctx) {
    const resp = await ctx.next();
    resp.headers.set("X-API-Version", "1");
    return resp;
  },
  async POST(ctx) {
    const resp = await ctx.next();
    resp.headers.set("X-API-Version", "1");
    return resp;
  },
  async PUT(ctx) {
    const resp = await ctx.next();
    resp.headers.set("X-API-Version", "1");
    return resp;
  },
  async PATCH(ctx) {
    const resp = await ctx.next();
    resp.headers.set("X-API-Version", "1");
    return resp;
  },
  async DELETE(ctx) {
    const resp = await ctx.next();
    resp.headers.set("X-API-Version", "1");
    return resp;
  },
});
