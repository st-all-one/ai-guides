import { useSignal } from "@preact/signals";

export function NewsletterForm() {
  const email = useSignal("");
  const error = useSignal("");
  const status = useSignal<"idle" | "loading" | "success" | "error">("idle");

  const validate = (): boolean => {
    if (!email.value.trim()) {
      error.value = "Email is required";
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
      error.value = "Please enter a valid email";
      return false;
    }
    error.value = "";
    return true;
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!validate()) return;

    status.value = "loading";

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.value }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (data.errors) {
          error.value = data.errors.email || "Something went wrong";
          status.value = "idle";
          return;
        }
        throw new Error("Failed");
      }

      status.value = "success";
      email.value = "";
      error.value = "";
    } catch {
      status.value = "error";
    }
  };

  if (status.value === "success") {
    return (
      <div class="animate-slide-up text-center">
        <div class="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="text-success"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p class="text-success font-medium">You're subscribed!</p>
        <p class="text-sm text-base-content/50 mt-1">
          Check your inbox for a confirmation email.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} class="max-w-md mx-auto">
      <div class="flex flex-col sm:flex-row gap-3">
        <div class="flex-1">
          <input
            type="email"
            class={`input input-bordered w-full ${
              error.value ? "input-error" : ""
            }`}
            placeholder="Enter your email"
            value={email.value}
            onInput={(e) => {
              email.value = (e.target as HTMLInputElement).value;
              if (error.value) error.value = "";
            }}
            aria-required="true"
            autocomplete="email"
            aria-invalid={!!error.value}
            aria-describedby={error.value ? "newsletter-error" : undefined}
            aria-errormessage={error.value ? "newsletter-error" : undefined}
          />
          {error.value && (
            <p id="newsletter-error" role="alert" class="text-error text-xs mt-1 ml-1">
              {error.value}
            </p>
          )}
          {status.value === "error" && (
            <p role="alert" class="text-error text-xs mt-1 ml-1">
              Something went wrong. Please try again.
            </p>
          )}
        </div>
        <button
          type="submit"
          class="btn btn-primary shrink-0"
          disabled={status.value === "loading"}
          aria-busy={status.value === "loading" ? "true" : undefined}
        >
          {status.value === "loading" ? (
            <>
              <span class="loading loading-spinner loading-sm" />
              Subscribing
            </>
          ) : (
            "Subscribe"
          )}
        </button>
      </div>
    </form>
  );
}
