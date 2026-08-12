import { define } from "../../../../utils/define.ts";
import { ApiError } from "../../../../utils/errors.ts";
import { validate } from "../../../../utils/validation.ts";
import { verifyToken } from "../../../../utils/auth.ts";

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

interface UserWithRelations extends User {
  posts?: Array<{ id: string; title: string }>;
  orders?: Array<{ id: string; total: number }>;
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
    const url = new URL(ctx.req.url);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
    const perPage = Math.min(100, Math.max(1, Number(url.searchParams.get("per_page") ?? "20")));
    const sort = url.searchParams.get("sort");
    const order = (url.searchParams.get("order") as "asc" | "desc") ?? "asc";
    const search = url.searchParams.get("q");
    const roleFilter = url.searchParams.get("role");
    const include = url.searchParams.get("include")?.split(",").map((s) => s.trim()) ?? [];

    let filtered = [...users];

    if (roleFilter) {
      filtered = filtered.filter((u) => u.role === roleFilter);
    }

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q),
      );
    }

    if (sort) {
      const key = sort as keyof User;
      filtered.sort((a, b) => {
        const aVal = a[key];
        const bVal = b[key];
        if (aVal < bVal) return order === "asc" ? -1 : 1;
        if (aVal > bVal) return order === "asc" ? 1 : -1;
        return 0;
      });
    }

    const total = filtered.length;
    const start = (page - 1) * perPage;
    const paged = filtered.slice(start, start + perPage);

    const data: UserWithRelations[] = paged.map((u) => {
      const enriched: UserWithRelations = { ...u };

      if (include.includes("posts")) {
        enriched.posts = [
          { id: crypto.randomUUID(), title: `Post by ${u.name}` },
          { id: crypto.randomUUID(), title: `Another post by ${u.name}` },
        ];
      }

      if (include.includes("orders")) {
        enriched.orders = [
          { id: crypto.randomUUID(), total: Math.round(Math.random() * 500 * 100) / 100 },
        ];
      }

      return enriched;
    });

    const totalPages = Math.ceil(total / perPage);
    const baseUrl = `${url.origin}/api/v2/users`;

    return Response.json({
      success: true,
      data,
      pagination: {
        total,
        page,
        per_page: perPage,
        pages: totalPages,
      },
      _links: {
        self: { href: `${baseUrl}?page=${page}&per_page=${perPage}` },
        first: { href: `${baseUrl}?page=1&per_page=${perPage}` },
        last: { href: `${baseUrl}?page=${totalPages}&per_page=${perPage}` },
        next: page < totalPages
          ? { href: `${baseUrl}?page=${page + 1}&per_page=${perPage}` }
          : null,
        prev: page > 1
          ? { href: `${baseUrl}?page=${page - 1}&per_page=${perPage}` }
          : null,
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
        "/api/v2/users",
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
        "/api/v2/users",
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
        "/api/v2/users",
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

    return new Response(
      JSON.stringify({
        success: true,
        data: newUser,
        _links: {
          self: { href: `/api/v2/users/${newUser.id}` },
          collection: { href: "/api/v2/users" },
        },
      }),
      {
        status: 201,
        headers: {
          "Content-Type": "application/json",
          "Location": `/api/v2/users/${newUser.id}`,
        },
      },
    );
  },
});
