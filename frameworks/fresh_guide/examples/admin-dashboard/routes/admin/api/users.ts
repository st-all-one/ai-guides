import { define } from "@/utils/define.ts";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

const users: User[] = [
  { id: "1", name: "Admin User", email: "admin@example.com", role: "admin" },
  { id: "2", name: "Editor User", email: "editor@example.com", role: "editor" },
  { id: "3", name: "Viewer User", email: "viewer@example.com", role: "viewer" },
  { id: "4", name: "John Smith", email: "john@example.com", role: "editor" },
  { id: "5", name: "Jane Doe", email: "jane@example.com", role: "viewer" },
  { id: "6", name: "Bob Johnson", email: "bob@example.com", role: "viewer" },
  { id: "7", name: "Alice Brown", email: "alice@example.com", role: "editor" },
  { id: "8", name: "Charlie Wilson", email: "charlie@example.com", role: "viewer" },
];

let nextId = 9;

export const handler = define.handlers({
  GET(ctx) {
    const id = ctx.params.id;
    const url = new URL(ctx.req.url);

    if (ctx.url.pathname.endsWith("/users") && !id) {
      return Response.json(users);
    }

    if (id) {
      const user = users.find((u) => u.id === id);
      if (!user) {
        return Response.json({ error: "User not found" }, { status: 404 });
      }
      return Response.json(user);
    }

    if (url.pathname.match(/\/users\/[^/]+$/)) {
      const pathParts = url.pathname.split("/");
      const userId = pathParts[pathParts.length - 1];
      const user = users.find((u) => u.id === userId);
      if (!user) {
        return Response.json({ error: "User not found" }, { status: 404 });
      }
      return Response.json(user);
    }

    return Response.json(users);
  },

  async POST(ctx) {
    let body: Partial<User>;
    try {
      body = await ctx.req.json();
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (!body.name || !body.email || !body.role) {
      return Response.json(
        { error: "Name, email, and role are required" },
        { status: 400 },
      );
    }

    const newUser: User = {
      id: String(nextId++),
      name: body.name,
      email: body.email,
      role: body.role,
    };

    users.push(newUser);
    return Response.json(newUser, { status: 201 });
  },

  async PUT(ctx) {
    const id = ctx.params.id;
    if (!id) {
      return Response.json({ error: "User ID required" }, { status: 400 });
    }

    const userIndex = users.findIndex((u) => u.id === id);
    if (userIndex === -1) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    let body: Partial<User>;
    try {
      body = await ctx.req.json();
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    users[userIndex] = { ...users[userIndex], ...body };
    return Response.json(users[userIndex]);
  },

  DELETE(ctx) {
    const id = ctx.params.id;
    if (!id) {
      return Response.json({ error: "User ID required" }, { status: 400 });
    }

    const userIndex = users.findIndex((u) => u.id === id);
    if (userIndex === -1) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const deleted = users.splice(userIndex, 1)[0];
    return Response.json({ deleted: true, user: deleted });
  },
});
