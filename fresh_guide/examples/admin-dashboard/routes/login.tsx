import { define } from "@/utils/define.ts";

export const config = {
  skipInheritedLayouts: true,
  skipAppWrapper: true,
};

export const handler = define.handlers({
  GET(ctx) {
    if (ctx.state.user) {
      return new Response(null, {
        status: 302,
        headers: { Location: "/admin" },
      });
    }
    return ctx.render({ error: "" });
  },
  async POST(ctx) {
    const form = await ctx.req.formData();
    const email = form.get("email")?.toString() || "";
    const password = form.get("password")?.toString() || "";

    if (!email || !password) {
      return ctx.render({ error: "Email and password are required." });
    }

    const roleMap: Record<string, string> = {
      "admin@example.com": "admin-session",
      "editor@example.com": "editor-session",
      "viewer@example.com": "viewer-session",
    };

    const sessionId = roleMap[email];
    if (!sessionId) {
      return ctx.render({ error: "Invalid email or password." });
    }

    const headers = new Headers();
    headers.set(
      "Set-Cookie",
      `session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`,
    );
    headers.set("Location", "/admin");

    return new Response(null, { status: 302, headers });
  },
});

export default define.page<typeof handler>(function LoginPage({ data }) {
  return (
    <html lang="en" data-theme="light">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Login — Admin Dashboard</title>
      </head>
      <body class="bg-base-200 min-h-screen flex items-center justify-center p-4">
        <div class="card bg-base-100 shadow-xl w-full max-w-md">
          <div class="card-body">
            <h1 class="text-2xl font-bold text-center mb-2">Admin Dashboard</h1>
            <p class="text-base-content/60 text-center mb-6">
              Sign in to your account
            </p>

            {data.error && (
              <div class="alert alert-error mb-4" role="alert">
                <span>{data.error}</span>
              </div>
            )}

            <form method="POST">
              <div class="form-control mb-4">
                <label class="label" for="email">
                  <span class="label-text">Email</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  class="input input-bordered w-full"
                  placeholder="admin@example.com"
                  required
                  aria-required="true"
                  autocomplete="email"
                />
              </div>

              <div class="form-control mb-6">
                <label class="label" for="password">
                  <span class="label-text">Password</span>
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  class="input input-bordered w-full"
                  placeholder="••••••••"
                  required
                  aria-required="true"
                  autocomplete="current-password"
                />
              </div>

              <button type="submit" class="btn btn-primary w-full">
                Sign In
              </button>
            </form>

            <div class="mt-4 text-xs text-base-content/50 text-center">
              Demo: admin@example.com / editor@example.com / viewer@example.com
            </div>
          </div>
        </div>
      </body>
    </html>
  );
});
