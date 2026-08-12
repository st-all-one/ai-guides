import { define } from "../../../../../utils/define.ts";
import { ApiError } from "../../../../../utils/errors.ts";
import { verifyToken } from "../../../../../utils/auth.ts";

const avatars = new Map<string, string>();

const MAX_FILE_SIZE = 5 * 1024 * 1024;

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
    const avatar = avatars.get(ctx.params.id);

    if (!avatar) {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <rect width="200" height="200" fill="#e2e8f0"/>
  <text x="100" y="110" font-size="60" fill="#94a3b8" text-anchor="middle" font-family="sans-serif">${ctx.params.id.slice(0, 2).toUpperCase()}</text>
</svg>`;

      return new Response(svg, {
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    const [mime, data] = avatar.split(";");
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    return new Response(bytes, {
      headers: { "Content-Type": mime },
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
        `/api/v1/users/${ctx.params.id}/avatar`,
      );
    }

    if (ctx.params.id !== auth.userId && auth.role !== "admin") {
      throw new ApiError(
        403,
        "https://api.example.com/problems/forbidden",
        "Forbidden",
        "You can only update your own avatar",
        `/api/v1/users/${ctx.params.id}/avatar`,
      );
    }

    const contentType = ctx.req.headers.get("content-type") ?? "";
    if (!contentType.startsWith("multipart/form-data")) {
      throw new ApiError(
        415,
        "https://api.example.com/problems/unsupported-media-type",
        "Unsupported Media Type",
        "Content-Type must be multipart/form-data",
        `/api/v1/users/${ctx.params.id}/avatar`,
      );
    }

    const contentLength = Number(
      ctx.req.headers.get("content-length") ?? "0",
    );
    if (contentLength > MAX_FILE_SIZE) {
      throw new ApiError(
        413,
        "https://api.example.com/problems/payload-too-large",
        "Payload Too Large",
        "File size must not exceed 5MB",
        `/api/v1/users/${ctx.params.id}/avatar`,
      );
    }

    const buffer = await ctx.req.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    const boundary = contentType.split("boundary=")[1];
    if (!boundary) {
      throw new ApiError(
        400,
        "https://api.example.com/problems/bad-request",
        "Bad Request",
        "Missing boundary in multipart request",
        `/api/v1/users/${ctx.params.id}/avatar`,
      );
    }

    const decoder = new TextDecoder();
    const text = decoder.decode(bytes);
    const parts = text.split(`--${boundary}`);
    let fileData: Uint8Array | null = null;
    let fileMime = "";

    for (const part of parts) {
      if (!part.includes("Content-Disposition")) continue;

      const headerEnd = part.indexOf("\r\n\r\n");
      if (headerEnd === -1) continue;

      const headers = part.slice(0, headerEnd);
      const bodyStart = headerEnd + 4;
      let bodyEnd = part.lastIndexOf(`\r\n--${boundary}`);
      if (bodyEnd === -1) bodyEnd = part.lastIndexOf(`\r\n`);

      if (!headers.includes('name="file"') && !headers.includes('name="avatar"')) continue;

      const mimeMatch = headers.match(/Content-Type:\s*(\S+)/);
      fileMime = mimeMatch ? mimeMatch[1].trim() : "application/octet-stream";

      if (!fileMime.startsWith("image/")) {
        throw new ApiError(
          422,
          "https://api.example.com/problems/validation-error",
          "Validation Error",
          "File must be an image",
          `/api/v1/users/${ctx.params.id}/avatar`,
          { file: ["file must be an image (image/*)"] },
        );
      }

      const bodyText = part.slice(bodyStart, bodyEnd === -1 ? undefined : bodyEnd);
      fileData = new TextEncoder().encode(bodyText);
      break;
    }

    if (!fileData) {
      throw new ApiError(
        400,
        "https://api.example.com/problems/bad-request",
        "Bad Request",
        "No file found in request",
        `/api/v1/users/${ctx.params.id}/avatar`,
      );
    }

    const b64 = btoa(String.fromCharCode(...fileData));
    avatars.set(ctx.params.id, `${fileMime};${b64}`);

    return new Response(
      JSON.stringify({
        avatar_url: `/api/v1/users/${ctx.params.id}/avatar`,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  },

  async DELETE(ctx) {
    const auth = await authenticate(ctx);
    if (!auth) {
      throw new ApiError(
        401,
        "https://api.example.com/problems/unauthorized",
        "Unauthorized",
        "Authentication required",
        `/api/v1/users/${ctx.params.id}/avatar`,
      );
    }

    avatars.delete(ctx.params.id);

    return new Response(null, { status: 204 });
  },
});
