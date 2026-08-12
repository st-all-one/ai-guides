import { define } from "@/utils/define.ts";
import PageHeader from "@/components/PageHeader.tsx";
import Breadcrumb from "@/components/Breadcrumb.tsx";
import { HttpError } from "fresh";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

const mockUsers: User[] = [
  { id: "1", name: "Admin User", email: "admin@example.com", role: "admin" },
  { id: "2", name: "Editor User", email: "editor@example.com", role: "editor" },
  { id: "3", name: "Viewer User", email: "viewer@example.com", role: "viewer" },
  { id: "4", name: "John Smith", email: "john@example.com", role: "editor" },
  { id: "5", name: "Jane Doe", email: "jane@example.com", role: "viewer" },
  { id: "6", name: "Bob Johnson", email: "bob@example.com", role: "viewer" },
  { id: "7", name: "Alice Brown", email: "alice@example.com", role: "editor" },
  { id: "8", name: "Charlie Wilson", email: "charlie@example.com", role: "viewer" },
];

export const handler = define.handlers({
  GET(ctx) {
    const user = mockUsers.find((u) => u.id === ctx.params.id);
    if (!user) throw new HttpError(404, "User not found");
    return ctx.render({ user, success: "" });
  },
  async PUT(ctx) {
    const user = mockUsers.find((u) => u.id === ctx.params.id);
    if (!user) throw new HttpError(404, "User not found");
    const body = await ctx.req.json();
    Object.assign(user, body);
    return ctx.render({ user, success: "User updated successfully." });
  },
});

export default define.page<typeof handler>(function UserDetailPage({ data, params }) {
  return (
    <>
      <PageHeader
        title={data.user.name}
        description={`Manage ${data.user.name}'s account details.`}
      />

      {data.success && (
        <div class="alert alert-success mb-4" role="alert">
          <span>{data.success}</span>
        </div>
      )}

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="card bg-base-100 shadow-md border border-base-300 lg:col-span-1">
          <div class="card-body items-center text-center">
            <div class="avatar placeholder mb-4">
              <div class="bg-neutral text-neutral-content w-24 rounded-full">
                <span class="text-3xl">
                  {data.user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </span>
              </div>
            </div>
            <h2 class="text-xl font-bold">{data.user.name}</h2>
            <p class="text-base-content/60">{data.user.email}</p>
            <span class="badge badge-lg badge-primary mt-2">
              {data.user.role}
            </span>
          </div>
        </div>

        <div class="card bg-base-100 shadow-md border border-base-300 lg:col-span-2">
          <div class="card-body">
            <h2 class="card-title text-lg mb-4">Edit Profile</h2>
            <form method="POST" action={`/admin/users/${params.id}`}>
              <input type="hidden" name="_method" value="PUT" />

              <div class="form-control mb-4">
                <label class="label" for="name">
                  <span class="label-text">Name</span>
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  class="input input-bordered w-full"
                  value={data.user.name}
                  aria-required="true"
                  autocomplete="name"
                />
              </div>

              <div class="form-control mb-4">
                <label class="label" for="email">
                  <span class="label-text">Email</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  class="input input-bordered w-full"
                  value={data.user.email}
                  aria-required="true"
                  autocomplete="email"
                />
              </div>

              <div class="form-control mb-6">
                <label class="label" for="role">
                  <span class="label-text">Role</span>
                </label>
                <select
                  id="role"
                  name="role"
                  class="select select-bordered w-full"
                >
                  <option
                    value="viewer"
                    selected={data.user.role === "viewer"}
                  >
                    Viewer
                  </option>
                  <option
                    value="editor"
                    selected={data.user.role === "editor"}
                  >
                    Editor
                  </option>
                  <option
                    value="admin"
                    selected={data.user.role === "admin"}
                  >
                    Admin
                  </option>
                </select>
              </div>

              <button type="submit" class="btn btn-primary">
                Save Changes
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
});
