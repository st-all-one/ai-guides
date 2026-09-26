import { define } from "@/utils/define.ts";
import { Partial } from "fresh/runtime";
import { Section } from "@/components/Section.tsx";
import { TestimonialCarousel } from "@/islands/TestimonialCarousel.tsx";

const testimonials = [
  {
    name: "Sarah Chen",
    role: "CTO",
    company: "TechVentures",
    quote:
      "ShipFast transformed our deployment pipeline. We went from 2-hour deploys to under 30 seconds. Our team morale has never been higher.",
    rating: 5,
  },
  {
    name: "Marcus Rivera",
    role: "Lead Engineer",
    company: "DataFlow",
    quote:
      "The developer experience is unmatched. Everything just works the way you'd expect. Our team adopted it in a single sprint.",
    rating: 5,
  },
  {
    name: "Emily Park",
    role: "VP of Engineering",
    company: "ScaleUp",
    quote:
      "We evaluated every platform on the market. ShipFast was the only one that met our security requirements while keeping costs predictable.",
    rating: 5,
  },
  {
    name: "James O'Brien",
    role: "Founder",
    company: "QuickStart",
    quote:
      "As a solo founder, ShipFast lets me compete with teams ten times my size. The free tier is incredibly generous for getting started.",
    rating: 4,
  },
  {
    name: "Aisha Patel",
    role: "DevOps Lead",
    company: "CloudNine",
    quote:
      "Their support team is phenomenal. We had a custom requirement and they shipped a solution within 48 hours. That kind of partnership is rare.",
    rating: 5,
  },
  {
    name: "Dmitri Volkov",
    role: "Senior Developer",
    company: "NextGen Labs",
    quote:
      "The edge network performance is incredible. We serve users in 40+ countries and everyone gets the same fast experience. No more CDN configuration headaches.",
    rating: 5,
  },
];

export default define.page(
  function TestimonialsPartial() {
    return (
      <Partial name="testimonials-section">
        <Section id="testimonials">
          <div class="text-center mb-16">
            <h2 class="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">
              Loved by{" "}
              <span class="bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">
                developers
              </span>
            </h2>
            <p class="text-base-content/60 text-lg max-w-2xl mx-auto">
              Join thousands of teams who ship faster with ShipFast.
            </p>
          </div>

          <TestimonialCarousel testimonials={testimonials} />
        </Section>
      </Partial>
    );
  },
  {
    skipAppWrapper: true,
    skipInheritedLayouts: true,
  },
);
