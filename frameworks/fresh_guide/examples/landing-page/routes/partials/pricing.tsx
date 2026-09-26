import { define } from "@/utils/define.ts";
import { Partial } from "fresh/runtime";
import { Section } from "@/components/Section.tsx";
import { PricingToggle } from "@/islands/PricingToggle.tsx";

export default define.page(
  function PricingPartial() {
    return (
      <Partial name="pricing-section">
        <Section id="pricing" dark>
          <div class="text-center mb-16">
            <h2 class="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">
              Simple,{" "}
              <span class="bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">
                transparent pricing
              </span>
            </h2>
            <p class="text-base-content/60 text-lg max-w-2xl mx-auto">
              No hidden fees. No surprises. Start free and upgrade as you grow.
            </p>
          </div>

          <PricingToggle />
        </Section>
      </Partial>
    );
  },
  {
    skipAppWrapper: true,
    skipInheritedLayouts: true,
  },
);
