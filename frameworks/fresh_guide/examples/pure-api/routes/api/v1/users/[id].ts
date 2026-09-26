import { define } from "../../../../../utils/define.ts";
import { ApiError } from "../../../../../utils/errors.ts";
import { verifyToken } from "../../../../../utils/auth.ts";
import { validate } from "../../../../../utils/validation.ts";
import { paginateResponse } from "../../../../../utils/pagination.ts";

interface User {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  created_at: string;
}

const users: User[] = Array.from({ length: 50 }, (_, i) => ({
  id: crypto.randomUUID(),
  name: `User ${i + 1}`,
  email: `user${i + 1}@example.com`,
  role: (i < 5 ? "admin" : "user") as "user" | "admin",
  created_at: new Date(
    Date.now() - Math.random() * 365 * 86400 * 1000,
  ).toISOString(),
}));

function getUserById(id: string): User | undefined {
  return users.find((u) => u.id === id);
}

function userLinks(user: User) {
  return {
    _links: {
      self: { href: `/api/v1/users/${user.id}` },
      avatar: { href: `/api/v1/users/${user.id}/avatar` },
      collection: { href: "/api/v1/users" },
    },
  };
}

async function authenticate(
  ctx: Parameters<typeof handler.GET>[0],
): Promise<{ userId: string; role: string } | null> {
  const authHeader = ctx.req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const payload = await verifyToken(token);
  return payload ? { userId: payload.userId, role: payload.role } : null;
}

export const handler = define.handlers({
  GET(ctx) {
    const user = getUserById(ctx.params.id);
    if (!user) {
      throw new ApiError(
        404,
        "https://api.example.com/problems/not-found",
        "User Not Found",
        `No user exists with id '${ctx.params.id}'`,
        `/api/v1/users/${ctx.params.id}`,
      );
    }

    return Response.json({ ...user, ...userLinks(user) });
  },

  async PUT(ctx) {
    const auth = await authenticate(ctx);
    if (!auth) {
      throw new ApiError(
        401,
        "https://api.example.com/problems/unauthorized",
        "Unauthorized",
        "Authentication required",
        `/api/v1/users/${ctx.params.id}`,
      );
    }

    const user = getUserById(ctx.params.id);
    if (!user) {
      throw new ApiError(
        404,
        "https://api.example.com/problems/not-found",
        "User Not Found",
        `No user exists with id '${ctx.params.id}'`,
        `/api/v1/users/${ctx.params.id}`,
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await ctx.req.json();
    } catch {
      throw new ApiError(
        400,
        "https://api.example.com/problems/invalid-json",
        "Invalid JSON",
        "Request body must be valid JSON",
        `/api/v1/users/${ctx.params.id}`,
      );
    }

    const errors = validate(body, {
      name: { required: true, min: 2, max: 100 },
      email: { required: true, type: "email" },
      role: { required: true, pattern: /^(user|admin)$/ },
    });

    if (errors) {
      throw new ApiError(
        422,
        "https://api.example.com/problems/validation-error",
        "Validation Error",
        "One or more fields failed validation",
        `/api/v1/users/${ctx.params.id}`,
        errors,
      );
    }

    user.name = body.name as string;
    user.email = body.email as string;
    user.role = body.role as "user" | "admin";

    return Response.json({ ...user, ...userLinks(user) });
  },

  async PATCH(ctx) {
    const auth = await authenticate(ctx);
    if (!auth) {
      throw new ApiError(
        401,
        "https://api.example.com/problems/unauthorized",
        "Unauthorized",
        "Authentication required",
        `/api/v1/users/${ctx.params.id}`,
      );
    }

    const user = getUserById(ctx.params.id);
    if (!user) {
      throw new ApiError(
        404,
        "https://api.example.com/problems/not-found",
        "User Not Found",
        `No user exists with id '${ctx.params.id}'`,
        `/api/v1/users/${ctx.params.id}`,
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await ctx.req.json();
    } catch {
      throw new ApiError(
        400,
        "https://api.example.com/problems/invalid-json",
        "Invalid JSON",
        "Request body must be valid JSON",
        `/api/v1/users/${ctx.params.id}`,
      );
    }

    if (body.name !== undefined) {
      if (typeof body.name !== "string" || body.name.length < 2 || body.name.length > 100) {
        throw new ApiError(
          422, "https://api.example.com/problems/validation-error",
          "Validation Error", "name must be 2-100 characters",
          `/api/v1/users/${ctx.params.id}`,
          { name: ["name must be 2-100 characters"] },
        );
      }
      user.name = body.name;
    }
    if (body.email !== undefined) {
      if (typeof body.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
        throw new ApiError(
          422, "https://api.example.com/problems/validation-error",
          "Validation Error", "email must be a valid email",
          `/api/v1/users/${ctx.params.id}`,
          { email: ["email must be a valid email"] },
        );
      }
      user.email = body.email;
    }
    if (body.role !== undefined) {
      if (body.role !== "user" && body.role !== "admin") {
        throw new ApiError(
          422, "https://api.example.com/problems/validation-error",
          "Validation Error", "role must be user or admin",
          `/api/v1/users/${ctx.params.id}`,
          { role: ["role must be user or admin"] },
        );
      }
      user.role = body.role as "user" | "admin";
    }

    return Response.json({ ...user, ...userLinks(user) });
  },

  async DELETE(ctx) {
    const auth = await authenticate(ctx);
    if (!auth) {
      throw new ApiError(
        401,
        "https://api.example.com/problems/unauthorized",
        "Unauthorized",
        "Authentication required",
        `/api/v1/users/${ctx.params.id}`,
      );
    }

    if (auth.role !== "admin") {
      throw new ApiError(
        403,
        "https://api.example.com/problems/forbidden",
        "Forbidden",
        "Admin role required to delete users",
        `/api/v1/users/${ctx.params.id}`,
      );
    }

    const idx = users.findIndex((u) => u.id === ctx.params.id);
    if (idx === -1) {
      throw new ApiError(
        404,
        "https://api.example.com/problems/not-found",
        "User Not Found",
        `No user exists with id '${ctx.params.id}'`,
        `/api/v1/users/${ctx.params.id}`,
      );
    }

    users.splice(idx, 1);

    return new Response(null, { status: 204 });
  },
});
