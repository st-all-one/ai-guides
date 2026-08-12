import { define } from "../../../../utils/define.ts";
import { ApiError } from "../../../../utils/errors.ts";
import { validate } from "../../../../utils/validation.ts";
import { hashPassword } from "../../../../utils/auth.ts";

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
        "/api/v1/auth/register",
      );
    }

    const errors = validate(body, {
      name: { required: true, min: 2, max: 100 },
      email: { required: true, type: "email" },
      password: { required: true, min: 6, max: 128 },
    });

    if (errors) {
      throw new ApiError(
        422,
        "https://api.example.com/problems/validation-error",
        "Validation Error",
        "One or more fields failed validation",
        "/api/v1/auth/register",
        errors,
      );
    }

    const { name, email, password } = body as {
      name: string;
      email: string;
      password: string;
    };

    const hashed = await hashPassword(password);
    const id = crypto.randomUUID();

    return new Response(
      JSON.stringify({
        id,
        name,
        email,
        role: "user",
        hashed_password: hashed,
        created_at: new Date().toISOString(),
      }),
      {
        status: 201,
        headers: {
          "Content-Type": "application/json",
          "Location": `/api/v1/users/${id}`,
        },
      },
    );
  },
});
