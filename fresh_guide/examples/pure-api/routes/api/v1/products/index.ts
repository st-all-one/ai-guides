import { define } from "../../../../utils/define.ts";
import { ApiError } from "../../../../utils/errors.ts";
import { validate } from "../../../../utils/validation.ts";
import { verifyToken } from "../../../../utils/auth.ts";
import {
  parsePagination,
  paginateResponse,
} from "../../../../utils/pagination.ts";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  in_stock: boolean;
  created_at: string;
}

const products: Product[] = Array.from({ length: 30 }, (_, i) => ({
  id: crypto.randomUUID(),
  name: `Product ${i + 1}`,
  description: `Description for product ${i + 1}`,
  price: Math.round((Math.random() * 999 + 1) * 100) / 100,
  category: ["electronics", "clothing", "books", "food"][i % 4],
  in_stock: i % 3 !== 0,
  created_at: new Date(
    Date.now() - Math.random() * 180 * 86400 * 1000,
  ).toISOString(),
}));

function productLinks(product: Product) {
  return {
    _links: {
      self: { href: `/api/v1/products/${product.id}` },
      collection: { href: "/api/v1/products" },
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
    const url = new URL(ctx.req.url);
    const params = parsePagination(url);
    const category = url.searchParams.get("category");
    const minPrice = url.searchParams.get("min_price");
    const maxPrice = url.searchParams.get("max_price");
    const inStock = url.searchParams.get("in_stock");

    let filtered = [...products];

    if (category) {
      filtered = filtered.filter((p) => p.category === category);
    }
    if (minPrice) {
      const min = Number(minPrice);
      if (!isNaN(min)) filtered = filtered.filter((p) => p.price >= min);
    }
    if (maxPrice) {
      const max = Number(maxPrice);
      if (!isNaN(max)) filtered = filtered.filter((p) => p.price <= max);
    }
    if (inStock === "true") {
      filtered = filtered.filter((p) => p.in_stock);
    }

    if (params.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q),
      );
    }

    if (params.sort) {
      const key = params.sort as keyof Product;
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

    const dataWithLinks = paged.map((p) => ({ ...p, ...productLinks(p) }));
    const body = paginateResponse(dataWithLinks, total, params);

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
        "/api/v1/products",
      );
    }
    if (auth.role !== "admin") {
      throw new ApiError(
        403,
        "https://api.example.com/problems/forbidden",
        "Forbidden",
        "Admin role required to create products",
        "/api/v1/products",
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
        "/api/v1/products",
      );
    }

    const errors = validate(body, {
      name: { required: true, min: 1, max: 200 },
      description: { required: true, min: 1 },
      price: { required: true },
      category: { required: true },
    });

    if (errors) {
      throw new ApiError(
        422,
        "https://api.example.com/problems/validation-error",
        "Validation Error",
        "One or more fields failed validation",
        "/api/v1/products",
        errors,
      );
    }

    const newProduct: Product = {
      id: crypto.randomUUID(),
      name: body.name as string,
      description: body.description as string,
      price: Number(body.price),
      category: body.category as string,
      in_stock: (body.in_stock as boolean) ?? true,
      created_at: new Date().toISOString(),
    };

    products.unshift(newProduct);

    return new Response(JSON.stringify({ ...newProduct, ...productLinks(newProduct) }), {
      status: 201,
      headers: {
        "Content-Type": "application/json",
        "Location": `/api/v1/products/${newProduct.id}`,
      },
    });
  },
});
