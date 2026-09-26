import { define } from "../../../../utils/define.ts";
import { ApiError } from "../../../../utils/errors.ts";
import { validate } from "../../../../utils/validation.ts";
import { generateToken } from "../../../../utils/auth.ts";

export const handler = define.handlers({
  async POST(ctx) {
    let body: Record<string, unknown>;
    try {
      body = await ctx.req.json();
    } catch {
      throw new ApiError(
        400,
        "https://api.example.com/problems/invalid-json",
        "Invalid JSON",
        "Request body must be valid JSON",
        "/api/v1/auth/login",
      );
    }

    const errors = validate(body, {
      email: { required: true, type: "email" },
      password: { required: true, min: 1 },
    });

    if (errors) {
      throw new ApiError(
        422,
        "https://api.example.com/problems/validation-error",
        "Validation Error",
        "One or more fields failed validation",
        "/api/v1/auth/login",
        errors,
      );
    }

    const { email, password } = body as { email: string; password: string };

    if (password !== "password123") {
      throw new ApiError(
        401,
        "https://api.example.com/problems/invalid-credentials",
        "Invalid Credentials",
        "The email or password is incorrect",
        "/api/v1/auth/login",
      );
    }

    const userId = crypto.randomUUID();
    const role = email.includes("admin") ? "admin" : "user";

    const accessToken = await generateToken({ userId, role });

    return Response.json({
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: 86400,
      user: {
        id: userId,
        name: email.split("@")[0],
        email,
        role,
      },
    });
  },
});
