import { define } from "@/utils/define.ts";
import PageHeader from "@/components/PageHeader.tsx";
import DataTable from "@/components/DataTable.tsx";
import { useSignal } from "@preact/signals";
import UserFormModal from "@/islands/UserFormModal.tsx";
import DeleteConfirm from "@/islands/DeleteConfirm.tsx";

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
    return ctx.render({ users: mockUsers });
  },
});

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, string> = {
    admin: "badge-primary",
    editor: "badge-secondary",
    viewer: "badge-ghost",
  };
  return <span class={`badge badge-sm ${map[role] || "badge-ghost"}`}>{role}</span>;
}

function UsersPage({ data }: { data: { users: User[] } }) {
  const showCreate = useSignal(false);
  const editUser = useSignal<User | undefined>(undefined);
  const deleteUser = useSignal<User | undefined>(undefined);

  return (
    <>
      <PageHeader
        title="Users"
        description="Manage user accounts and permissions."
        action={{ label: "Create User", onClick: () => showCreate.value = true }}
      />

      <div class="card bg-base-100 shadow-md border border-base-300">
        <div class="card-body p-4">
          <DataTable
            columns={[
              {
                key: "name",
                label: "Name",
                render: (row: User) => (
                  <div class="flex items-center gap-3">
                    <div class="avatar placeholder">
                      <div class="bg-neutral text-neutral-content w-8 rounded-full">
                        <span class="text-xs">
                          {row.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div class="font-medium">{row.name}</div>
                      <div class="text-sm text-base-content/60">{row.email}</div>
                    </div>
                  </div>
                ),
              },
              { key: "email", label: "Email" },
              {
                key: "role",
                label: "Role",
                render: (row: User) => <RoleBadge role={row.role} />,
              },
            ]}
            rows={data.users}
            actions={(row: User) => (
              <div class="flex gap-2">
                <a
                  href={`/admin/users/${row.id}`}
                  class="btn btn-ghost btn-xs"
                >
                  Edit
                </a>
                <button
                  class="btn btn-ghost btn-xs text-error"
                  onClick={() => deleteUser.value = row}
                >
                  Delete
                </button>
              </div>
            )}
          />
        </div>
      </div>

      {showCreate.value && (
        <UserFormModal onClose={() => showCreate.value = false} />
      )}
      {editUser.value && (
        <UserFormModal
          user={editUser.value}
          onClose={() => editUser.value = undefined}
        />
      )}
      {deleteUser.value && (
        <DeleteConfirm
          userId={deleteUser.value.id}
          userName={deleteUser.value.name}
          onClose={() => deleteUser.value = undefined}
        />
      )}
    </>
  );
}

export default define.page<typeof handler>(UsersPage);
