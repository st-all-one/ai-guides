import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";

interface DeleteConfirmProps {
  userId: string;
  userName: string;
  onClose: () => void;
}

export default function DeleteConfirm(
  { userId, userName, onClose }: DeleteConfirmProps,
) {
  const deleting = useSignal(false);
  const error = useSignal("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  async function handleDelete() {
    deleting.value = true;
    error.value = "";
    try {
      const res = await fetch(`/admin/api/users/${userId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        error.value = "Failed to delete user";
        return;
      }
      globalThis.location.reload();
    } catch {
      error.value = "Network error. Please try again.";
    } finally {
      deleting.value = false;
    }
  }

  function handleOverlayClick(e: Event) {
    if ((e.target as HTMLElement).id === "delete-confirm-modal") {
      onClose();
    }
  }

  return (
    <div
      id="delete-confirm-modal"
      class="modal modal-open"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-confirm-title"
    >
      <div class="modal-box max-w-sm">
        <h3 id="delete-confirm-title" class="text-lg font-bold mb-2">Delete User</h3>
        <p class="text-base-content/70 mb-4">
          Are you sure you want to delete{" "}
          <strong>{userName}</strong>? This action cannot be undone.
        </p>

        {error.value && (
          <div class="alert alert-error mb-4" role="alert">
            <span>{error.value}</span>
          </div>
        )}

        <div class="modal-action">
          <button
            type="button"
            class="btn btn-ghost"
            onClick={onClose}
            disabled={deleting.value}
          >
            Cancel
          </button>
          <button
            type="button"
            class="btn btn-error"
            onClick={handleDelete}
            disabled={deleting.value}
            data-fresh-indicator
          >
            {deleting.value ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
