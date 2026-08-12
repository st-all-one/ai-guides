interface PricingCardProps {
  name: string;
  price: { monthly: number; yearly: number };
  features: string[];
  highlighted?: boolean;
  cta: string;
  interval: "monthly" | "yearly";
}

export function PricingCard({
  name,
  price,
  features,
  highlighted = false,
  cta,
  interval,
}: PricingCardProps) {
  const displayPrice = interval === "yearly"
    ? Math.round(price.yearly / 12)
    : price.monthly;
  const annualPrice = interval === "yearly" ? price.yearly : null;

  return (
    <div
      class={`card border-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
        highlighted
          ? "border-brand-500 bg-base-100 relative shadow-lg"
          : "border-base-200 bg-base-100"
      }`}
    >
      {highlighted && (
        <div class="absolute -top-3 left-1/2 -translate-x-1/2">
          <span class="badge badge-primary text-xs font-bold px-4 py-3">
            Most Popular
          </span>
        </div>
      )}

      <div class="card-body p-6 sm:p-8">
        <h3 class="text-lg font-bold mb-1">{name}</h3>
        <p class="text-base-content/50 text-sm mb-6">
          {name === "Starter"
            ? "For individuals and small projects"
            : name === "Pro"
            ? "For growing teams and businesses"
            : "For large-scale organizations"}
        </p>

        <div class="mb-6">
          <div class="flex items-baseline gap-1">
            <span class="text-4xl font-extrabold">${displayPrice}</span>
            <span class="text-base-content/50 text-sm">/month</span>
          </div>
          {annualPrice !== null && interval === "yearly" && (
            <p class="text-xs text-base-content/50 mt-1">
              ${annualPrice} billed annually
            </p>
          )}
        </div>

        <a
          href="#cta"
          class={`btn w-full mb-6 ${
            highlighted ? "btn-primary" : "btn-outline"
          }`}
        >
          {cta}
        </a>

        <ul class="space-y-3 text-sm">
          {features.map((feature) => (
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
  );
}
