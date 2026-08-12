import { define } from "@/utils/define.ts";

interface NewsletterBody {
  email: string;
}

export const handler = define.handlers({
  async POST(ctx) {
    const body = await ctx.req.json().catch(() => null) as
      | NewsletterBody
      | null;

    if (!body) {
      return ctx.json({ errors: { email: "Invalid request body" } }, 422);
    }

    const errors: Record<string, string> = {};

    if (
      !body.email || typeof body.email !== "string" || !body.email.trim()
    ) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      errors.email = "Please enter a valid email";
    }

    if (Object.keys(errors).length > 0) {
      return ctx.json({ errors }, 422);
    }

    await new Promise((resolve) => setTimeout(resolve, 600));

    return ctx.json({
      success: true,
      message: "Subscribed! Welcome to the ShipFast community.",
    });
  },
});
