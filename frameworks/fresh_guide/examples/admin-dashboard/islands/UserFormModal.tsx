import { useSignal } from "@preact/signals";
import { useEffect, useRef } from "preact/hooks";

interface UserFormModalProps {
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  onClose: () => void;
}

export default function UserFormModal({ user, onClose }: UserFormModalProps) {
  const name = useSignal(user?.name ?? "");
  const email = useSignal(user?.email ?? "");
  const role = useSignal(user?.role ?? "viewer");
  const errors = useSignal<Record<string, string>>({});
  const submitting = useSignal(false);
  const isEditing = !!user;
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameInputRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!name.value.trim()) e.name = "Name is required";
    if (!email.value.trim()) {
      e.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
      e.email = "Invalid email format";
    }
    if (!role.value) e.role = "Role is required";
    errors.value = e;
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!validate()) return;

    submitting.value = true;
    try {
      const url = isEditing
        ? `/admin/api/users/${user!.id}`
        : "/admin/api/users";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.value, email: email.value, role: role.value }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        errors.value = { _form: data.message || "Something went wrong" };
        return;
      }

      globalThis.location.reload();
    } catch {
      errors.value = { _form: "Network error. Please try again." };
    } finally {
      submitting.value = false;
    }
  }

  function handleOverlayClick(e: Event) {
    if ((e.target as HTMLElement).id === "user-form-modal") {
      onClose();
    }
  }

  return (
    <div
      id="user-form-modal"
      class="modal modal-open"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-form-title"
    >
      <div class="modal-box max-w-md">
        <h3 id="user-form-title" class="text-lg font-bold mb-4">
          {isEditing ? "Edit User" : "Create User"}
        </h3>
        <form onSubmit={handleSubmit}>
          <div class="form-control mb-4">
            <label class="label" for="user-name">
              <span class="label-text">Name</span>
            </label>
            <input
              id="user-name"
              ref={nameInputRef}
              type="text"
              class={`input input-bordered w-full ${
                errors.value.name ? "input-error" : ""
              }`}
              value={name.value}
              onInput={(e) => name.value = (e.target as HTMLInputElement).value}
              placeholder="John Doe"
              aria-invalid={!!errors.value.name}
              aria-describedby={errors.value.name ? "name-error" : undefined}
            />
            {errors.value.name && (
              <span id="name-error" class="label-text-alt text-error" role="alert">{errors.value.name}
              </span>
            )}
          </div>

          <div class="form-control mb-4">
            <label class="label" for="user-email">
              <span class="label-text">Email</span>
            </label>
            <input
              id="user-email"
              type="email"
              class={`input input-bordered w-full ${
                errors.value.email ? "input-error" : ""
              }`}
              value={email.value}
              onInput={(e) =>
                email.value = (e.target as HTMLInputElement).value}
              placeholder="john@example.com"
              aria-invalid={!!errors.value.email}
              aria-describedby={errors.value.email ? "email-error" : undefined}
            />
            {errors.value.email && (
              <span id="email-error" class="label-text-alt text-error" role="alert">{errors.value.email}
              </span>
            )}
          </div>

          <div class="form-control mb-4">
            <label class="label" for="user-role">
              <span class="label-text">Role</span>
            </label>
            <select
              id="user-role"
              class={`select select-bordered w-full ${
                errors.value.role ? "select-error" : ""
              }`}
              value={role.value}
              onChange={(e) =>
                role.value = (e.target as HTMLSelectElement).value}
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </select>
            {errors.value.role && (
              <span class="label-text-alt text-error" role="alert">{errors.value.role}
              </span>
            )}
          </div>

          {errors.value._form && (
            <div class="alert alert-error mb-4" role="alert">
              <span>{errors.value._form}</span>
            </div>
          )}

          <div class="modal-action">
            <button
              type="button"
              class="btn btn-ghost"
              onClick={onClose}
              disabled={submitting.value}
            >
              Cancel
            </button>
            <button
              type="submit"
              class="btn btn-primary"
              disabled={submitting.value}
              data-fresh-indicator
            >
              {submitting.value
                ? "Saving..."
                : isEditing
                ? "Update"
                : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
