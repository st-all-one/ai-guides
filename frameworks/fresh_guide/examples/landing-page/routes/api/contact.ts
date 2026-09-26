import { define } from "@/utils/define.ts";

interface ContactBody {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export const handler = define.handlers({
  async POST(ctx) {
    const body = await ctx.req.json().catch(() => null) as ContactBody | null;

    if (!body) {
      return ctx.json(
        { errors: { _form: "Invalid request body" } },
        422,
      );
    }

    const errors: Record<string, string> = {};

    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      errors.name = "Name is required";
    }

    if (
      !body.email || typeof body.email !== "string" || !body.email.trim()
    ) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      errors.email = "Please enter a valid email";
    }

    if (!body.subject || typeof body.subject !== "string") {
      errors.subject = "Please select a subject";
    }

    if (
      !body.message || typeof body.message !== "string" ||
      !body.message.trim()
    ) {
      errors.message = "Message is required";
    } else if (body.message.trim().length < 10) {
      errors.message = "Message must be at least 10 characters";
    }

    if (Object.keys(errors).length > 0) {
      return ctx.json({ errors }, 422);
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));

    return ctx.json({
      success: true,
      message: "Message sent! We'll get back to you within 24 hours.",
    });
  },
});
