import { useSignal } from "@preact/signals";

export function ContactForm() {
  const name = useSignal("");
  const email = useSignal("");
  const subject = useSignal("");
  const message = useSignal("");
  const errors = useSignal<Record<string, string>>({});
  const status = useSignal<"idle" | "loading" | "success" | "error">("idle");
  const touched = useSignal<Record<string, boolean>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.value.trim()) {
      newErrors.name = "Name is required";
    }

    if (!email.value.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!subject.value) {
      newErrors.subject = "Please select a subject";
    }

    if (!message.value.trim()) {
      newErrors.message = "Message is required";
    } else if (message.value.trim().length < 10) {
      newErrors.message = "Message must be at least 10 characters";
    }

    errors.value = newErrors;
    return Object.keys(newErrors).length === 0;
  };

  const handleBlur = (field: string) => {
    touched.value = { ...touched.value, [field]: true };
    validate();
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();

    touched.value = { name: true, email: true, subject: true, message: true };

    if (!validate()) return;

    status.value = "loading";

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.value,
          email: email.value,
          subject: subject.value,
          message: message.value,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (data.errors) {
          errors.value = data.errors;
          status.value = "idle";
          return;
        }
        throw new Error("Failed to send");
      }

      status.value = "success";
      name.value = "";
      email.value = "";
      subject.value = "";
      message.value = "";
      errors.value = {};
      touched.value = {};
    } catch {
      status.value = "error";
    }
  };

  if (status.value === "success") {
    return (
      <div class="max-w-lg mx-auto text-center py-12 animate-slide-up">
        <div class="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
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
        <h3 class="text-xl font-bold mb-2">Message Sent!</h3>
        <p class="text-base-content/60 mb-6">
          We'll get back to you within 24 hours.
        </p>
        <button
          type="button"
          class="btn btn-outline btn-sm"
          onClick={() => (status.value = "idle")}
        >
          Send Another Message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} class="max-w-lg mx-auto space-y-5" novalidate>
      <div class="form-control">
        <label class="label" for="contact-name">
          <span class="label-text font-medium">Name</span>
        </label>
        <input
          id="contact-name"
          type="text"
          class={`input input-bordered w-full ${
            touched.value.name && errors.value.name ? "input-error" : ""
          }`}
          placeholder="John Doe"
          value={name.value}
          onInput={(e) => (name.value = (e.target as HTMLInputElement).value)}
          onBlur={() => handleBlur("name")}
          aria-required="true"
          autocomplete="name"
          aria-invalid={!!errors.value.name}
          aria-describedby={errors.value.name ? "name-error" : undefined}
          aria-errormessage={errors.value.name ? "name-error" : undefined}
        />
        {touched.value.name && errors.value.name && (
          <label class="label" for="contact-name">
            <span
              id="name-error"
              role="alert"
              class="label-text-alt text-error"
            >
              {errors.value.name}
            </span>
          </label>
        )}
      </div>

      <div class="form-control">
        <label class="label" for="contact-email">
          <span class="label-text font-medium">Email</span>
        </label>
        <input
          id="contact-email"
          type="email"
          class={`input input-bordered w-full ${
            touched.value.email && errors.value.email ? "input-error" : ""
          }`}
          placeholder="john@example.com"
          value={email.value}
          onInput={(e) => (email.value = (e.target as HTMLInputElement).value)}
          onBlur={() => handleBlur("email")}
          aria-required="true"
          autocomplete="email"
          aria-invalid={!!errors.value.email}
          aria-describedby={errors.value.email ? "email-error" : undefined}
          aria-errormessage={errors.value.email ? "email-error" : undefined}
        />
        {touched.value.email && errors.value.email && (
          <label class="label" for="contact-email">
            <span
              id="email-error"
              role="alert"
              class="label-text-alt text-error"
            >
              {errors.value.email}
            </span>
          </label>
        )}
      </div>

      <div class="form-control">
        <label class="label" for="contact-subject">
          <span class="label-text font-medium">Subject</span>
        </label>
        <select
          id="contact-subject"
          class={`select select-bordered w-full ${
            touched.value.subject && errors.value.subject ? "select-error" : ""
          }`}
          value={subject.value}
          onChange={(e) =>
            (subject.value = (e.target as HTMLSelectElement).value)}
          onBlur={() => handleBlur("subject")}
        >
          <option value="" disabled>
            Select a topic
          </option>
          <option value="general">General Inquiry</option>
          <option value="sales">Sales</option>
          <option value="support">Technical Support</option>
          <option value="partnership">Partnership</option>
          <option value="other">Other</option>
        </select>
        {touched.value.subject && errors.value.subject && (
          <label class="label" for="contact-subject">
            <span class="label-text-alt text-error">
              {errors.value.subject}
            </span>
          </label>
        )}
      </div>

      <div class="form-control">
        <label class="label" for="contact-message">
          <span class="label-text font-medium">Message</span>
        </label>
        <textarea
          id="contact-message"
          class={`textarea textarea-bordered w-full h-32 ${
            touched.value.message && errors.value.message ? "textarea-error" : ""
          }`}
          placeholder="Tell us about your project..."
          value={message.value}
          onInput={(e) =>
            (message.value = (e.target as HTMLTextAreaElement).value)}
          onBlur={() => handleBlur("message")}
        />
        {touched.value.message && errors.value.message && (
          <label class="label" for="contact-message">
            <span class="label-text-alt text-error">
              {errors.value.message}
            </span>
          </label>
        )}
      </div>

      {status.value === "error" && (
        <div role="alert" class="alert alert-error">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>Something went wrong. Please try again.</span>
        </div>
      )}

      <button
        type="submit"
        class="btn btn-primary w-full"
        disabled={status.value === "loading"}
        aria-busy={status.value === "loading" ? "true" : undefined}
      >
        {status.value === "loading" ? (
          <>
            <span class="loading loading-spinner loading-sm" />
            Sending...
          </>
        ) : (
          <>
            Send Message
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M22 2 11 13" />
              <path d="m22 2-7 20-4-9-9-4 20-7z" />
            </svg>
          </>
        )}
      </button>
    </form>
  );
}
