import { define } from "../../../../utils/define.ts";
import { ApiError } from "../../../../utils/errors.ts";
import { validate } from "../../../../utils/validation.ts";
import { verifyToken } from "../../../../utils/auth.ts";
import {
  parsePagination,
  paginateResponse,
} from "../../../../utils/pagination.ts";

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

export const handler = define.handlers({
  GET(ctx) {
    const url = new URL(ctx.req.url);
    const params = parsePagination(url);
    const roleFilter = url.searchParams.get("role");

    let filtered = [...users];

    if (roleFilter) {
      filtered = filtered.filter((u) => u.role === roleFilter);
    }

    if (params.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q),
      );
    }

    if (params.sort) {
      const key = params.sort as keyof User;
      filtered.sort((a, b) => {
        const aVal = a[key];
        const bVal = b[key];
        if (aVal < bVal) return params.order === "asc" ? -1 : 1;
        if (aVal > bVal) return params.order === "asc" ? 1 : -1;
        return 0;
      });
    }

    const total = filtered.length;
    const start = (params.page - 1) * params.perPage;
    const paged = filtered.slice(start, start + params.perPage);

    const body = paginateResponse(paged, total, params);

    return new Response(JSON.stringify(body), {
      headers: {
        "Content-Type": "application/json",
        "X-Total-Count": String(total),
        "X-Page": String(params.page),
        "X-Per-Page": String(params.perPage),
      },
    });
  },

  async POST(ctx) {
    const auth = await authenticate(ctx);
    if (!auth) {
      throw new ApiError(
        401,
        "https://api.example.com/problems/unauthorized",
        "Unauthorized",
        "Authentication required",
        "/api/v1/users",
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
        "/api/v1/users",
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
        "/api/v1/users",
        errors,
      );
    }

    const newUser: User = {
      id: crypto.randomUUID(),
      name: body.name as string,
      email: body.email as string,
      role: body.role as "user" | "admin",
      created_at: new Date().toISOString(),
    };

    users.unshift(newUser);

    return new Response(JSON.stringify(newUser), {
      status: 201,
      headers: {
        "Content-Type": "application/json",
        "Location": `/api/v1/users/${newUser.id}`,
      },
    });
  },
});

async function authenticate(
  ctx: Parameters<typeof handler.GET>[0],
): Promise<{ userId: string; role: string } | null> {
  const authHeader = ctx.req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const payload = await verifyToken(token);
  return payload ? { userId: payload.userId, role: payload.role } : null;
}
