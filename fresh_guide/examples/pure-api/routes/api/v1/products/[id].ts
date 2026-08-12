import { define } from "../../../../utils/define.ts";
import { ApiError } from "../../../../utils/errors.ts";
import { verifyToken } from "../../../../utils/auth.ts";
import { validate } from "../../../../utils/validation.ts";

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

function getProduct(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

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

function requireAdmin(auth: { role: string } | null, path: string) {
  if (!auth) {
    throw new ApiError(
      401,
      "https://api.example.com/problems/unauthorized",
      "Unauthorized",
      "Authentication required",
      path,
    );
  }
  if (auth.role !== "admin") {
    throw new ApiError(
      403,
      "https://api.example.com/problems/forbidden",
      "Forbidden",
      "Admin role required",
      path,
    );
  }
}

export const handler = define.handlers({
  GET(ctx) {
    const product = getProduct(ctx.params.id);
    if (!product) {
      throw new ApiError(
        404,
        "https://api.example.com/problems/not-found",
        "Product Not Found",
        `No product exists with id '${ctx.params.id}'`,
        `/api/v1/products/${ctx.params.id}`,
      );
    }

    return Response.json({ ...product, ...productLinks(product) });
  },

  async PUT(ctx) {
    const auth = await authenticate(ctx);
    requireAdmin(auth, `/api/v1/products/${ctx.params.id}`);

    const product = getProduct(ctx.params.id);
    if (!product) {
      throw new ApiError(
        404,
        "https://api.example.com/problems/not-found",
        "Product Not Found",
        `No product exists with id '${ctx.params.id}'`,
        `/api/v1/products/${ctx.params.id}`,
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
        `/api/v1/products/${ctx.params.id}`,
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
        `/api/v1/products/${ctx.params.id}`,
        errors,
      );
    }

    product.name = body.name as string;
    product.description = body.description as string;
    product.price = Number(body.price);
    product.category = body.category as string;
    product.in_stock = body.in_stock !== undefined
      ? (body.in_stock as boolean)
      : product.in_stock;

    return Response.json({ ...product, ...productLinks(product) });
  },

  async PATCH(ctx) {
    const auth = await authenticate(ctx);
    requireAdmin(auth, `/api/v1/products/${ctx.params.id}`);

    const product = getProduct(ctx.params.id);
    if (!product) {
      throw new ApiError(
        404,
        "https://api.example.com/problems/not-found",
        "Product Not Found",
        `No product exists with id '${ctx.params.id}'`,
        `/api/v1/products/${ctx.params.id}`,
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
        `/api/v1/products/${ctx.params.id}`,
      );
    }

    if (body.name !== undefined) {
      if (typeof body.name !== "string" || body.name.length < 1 || body.name.length > 200) {
        throw new ApiError(
          422, "https://api.example.com/problems/validation-error",
          "Validation Error", "name must be 1-200 characters",
          `/api/v1/products/${ctx.params.id}`,
          { name: ["name must be 1-200 characters"] },
        );
      }
      product.name = body.name;
    }
    if (body.description !== undefined) {
      if (typeof body.description !== "string" || body.description.length < 1) {
        throw new ApiError(
          422, "https://api.example.com/problems/validation-error",
          "Validation Error", "description is required",
          `/api/v1/products/${ctx.params.id}`,
          { description: ["description is required"] },
        );
      }
      product.description = body.description;
    }
    if (body.price !== undefined) product.price = Number(body.price);
    if (body.category !== undefined) product.category = body.category as string;
    if (body.in_stock !== undefined) product.in_stock = body.in_stock as boolean;

    return Response.json({ ...product, ...productLinks(product) });
  },

  async DELETE(ctx) {
    const auth = await authenticate(ctx);
    requireAdmin(auth, `/api/v1/products/${ctx.params.id}`);

    const idx = products.findIndex((p) => p.id === ctx.params.id);
    if (idx === -1) {
      throw new ApiError(
        404,
        "https://api.example.com/problems/not-found",
        "Product Not Found",
        `No product exists with id '${ctx.params.id}'`,
        `/api/v1/products/${ctx.params.id}`,
      );
    }

    products.splice(idx, 1);

    return new Response(null, { status: 204 });
  },
});
