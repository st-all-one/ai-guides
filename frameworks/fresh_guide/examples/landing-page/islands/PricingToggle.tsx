import { useSignal } from "@preact/signals";

export function PricingToggle() {
  const interval = useSignal<"monthly" | "yearly">("monthly");

  return (
    <div class="flex flex-col items-center gap-4 mb-12">
      <div class="flex items-center gap-4">
        <span
          class={`text-sm font-medium transition-colors ${
            interval.value === "monthly"
              ? "text-base-content"
              : "text-base-content/40"
          }`}
        >
          Monthly
        </span>

        <button
          type="button"
          class={`relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${
            interval.value === "yearly" ? "bg-brand-600" : "bg-base-300"
          }`}
          onClick={() => {
            interval.value = interval.value === "monthly"
              ? "yearly"
              : "monthly";
          }}
          aria-label={`Switch to ${
            interval.value === "monthly" ? "yearly" : "monthly"
          } pricing`}
          aria-pressed={interval.value === "yearly"}
        >
          <span
            class={`block w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${
              interval.value === "yearly" ? "translate-x-8" : "translate-x-1"
            }`}
          />
        </button>

        <span
          class={`text-sm font-medium transition-colors ${
            interval.value === "yearly"
              ? "text-base-content"
              : "text-base-content/40"
          }`}
        >
          Yearly
        </span>

        <span class="badge badge-success badge-sm text-xs font-semibold ml-2">
          Save 20%
        </span>
      </div>

      <div class="flex gap-4 lg:gap-6 w-full max-w-5xl mx-auto justify-center flex-wrap">
        {[
          {
            name: "Starter",
            price: { monthly: 19, yearly: 182 },
            features: [
              "Up to 5 projects",
              "10 GB storage",
              "Basic analytics",
              "Email support",
              "Community access",
            ],
            cta: "Start Free Trial",
          },
          {
            name: "Pro",
            price: { monthly: 49, yearly: 470 },
            features: [
              "Unlimited projects",
              "100 GB storage",
              "Advanced analytics",
              "Priority support",
              "Custom domains",
              "Team collaboration",
              "API access",
            ],
            highlighted: true,
            cta: "Start Free Trial",
          },
          {
            name: "Enterprise",
            price: { monthly: 149, yearly: 1430 },
            features: [
              "Everything in Pro",
              "Unlimited storage",
              "Dedicated support",
              "SSO & SAML",
              "Custom contracts",
              "99.99% SLA",
              "Audit logs",
            ],
            cta: "Contact Sales",
          },
        ].map((plan) => (
          <div
            key={plan.name}
            class={`card border-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl w-full sm:w-80 ${
              plan.highlighted
                ? "border-brand-500 bg-base-100 relative shadow-lg"
                : "border-base-200 bg-base-100"
            }`}
          >
            {plan.highlighted && (
              <div class="absolute -top-3 left-1/2 -translate-x-1/2">
                <span class="badge badge-primary text-xs font-bold px-4 py-3">
                  Most Popular
                </span>
              </div>
            )}

            <div class="card-body p-6 sm:p-8">
              <h3 class="text-lg font-bold mb-1">{plan.name}</h3>
              <p class="text-base-content/50 text-sm mb-6">
                {plan.name === "Starter"
                  ? "For individuals and small projects"
                  : plan.name === "Pro"
                  ? "For growing teams and businesses"
                  : "For large-scale organizations"}
              </p>

              <div class="mb-6">
                <div class="flex items-baseline gap-1">
                  <span class="text-4xl font-extrabold">
                    $
                    {interval.value === "yearly"
                      ? Math.round(plan.price.yearly / 12)
                      : plan.price.monthly}
                  </span>
                  <span class="text-base-content/50 text-sm">/month</span>
                </div>
                {interval.value === "yearly" && (
                  <p class="text-xs text-base-content/50 mt-1">
                    ${plan.price.yearly} billed annually
                  </p>
                )}
              </div>

              <a
                href="#cta"
                class={`btn w-full mb-6 ${
                  plan.highlighted ? "btn-primary" : "btn-outline"
                }`}
              >
                {plan.cta}
              </a>

              <ul class="space-y-3 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} class="flex items-start gap-2">
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
                      class="text-success shrink-0 mt-0.5"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span class="text-base-content/70">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
