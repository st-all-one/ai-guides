import { define } from "@/utils/define.ts";
import { Partial } from "fresh/runtime";
import { Section } from "@/components/Section.tsx";
import { HeroSection } from "@/components/HeroSection.tsx";
import { FeatureCard } from "@/components/FeatureCard.tsx";
import { PricingToggle } from "@/islands/PricingToggle.tsx";
import { TestimonialCarousel } from "@/islands/TestimonialCarousel.tsx";
import { FAQ } from "@/islands/FAQ.tsx";
import { ContactForm } from "@/islands/ContactForm.tsx";
import { NewsletterForm } from "@/islands/NewsletterForm.tsx";

const features = [
  {
    icon: "\u{1F680}",
    title: "Lightning Fast Deploys",
    description:
      "Push to deploy in seconds. Our global edge network ensures your app loads instantly for users everywhere.",
  },
  {
    icon: "\u{1F6E1}\uFE0F",
    title: "Enterprise-Grade Security",
    description:
      "SOC 2 Type II certified with end-to-end encryption, automatic DDoS protection, and real-time threat monitoring.",
  },
  {
    icon: "\u{1F30D}",
    title: "Global Edge Network",
    description:
      "35+ regions worldwide. Your users get sub-50ms response times regardless of where they are.",
  },
  {
    icon: "\u{1F4CA}",
    title: "Real-Time Analytics",
    description:
      "Beautiful dashboards with live metrics. Track deployments, errors, performance, and user behavior in real time.",
  },
  {
    icon: "\u{1F527}",
    title: "Developer-First Tooling",
    description:
      "CLI, VS Code extension, GitHub integration, and comprehensive API. Everything you need in your workflow.",
  },
  {
    icon: "\u{1F504}",
    title: "Zero-Downtime Rollbacks",
    description:
      "Instant rollbacks to any previous deployment. Traffic splitting and canary releases built right in.",
  },
];

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

const faqItems = [
  {
    question: "How does the free trial work?",
    answer:
      "You get full access to all Pro features for 14 days — no credit card required. After the trial, you can choose to upgrade to a paid plan or continue using our free tier with limited features. We'll send you a reminder 3 days before your trial ends.",
  },
  {
    question: "Can I switch plans at any time?",
    answer:
      "Absolutely. You can upgrade or downgrade your plan at any time from your dashboard. When upgrading, you'll get immediate access to new features and we'll prorate the billing. When downgrading, the changes take effect at the end of your current billing cycle.",
  },
  {
    question: "What kind of support do you offer?",
    answer:
      "All plans include community support through our Discord server and documentation. Pro plans include email support with a 4-hour response time SLA. Enterprise plans get a dedicated support engineer, Slack integration, and 15-minute response time for critical issues.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Security is our top priority. We're SOC 2 Type II certified, all data is encrypted at rest (AES-256) and in transit (TLS 1.3). We perform regular penetration testing, maintain a bug bounty program, and offer SSO/SAML for enterprise customers.",
  },
  {
    question: "Do you offer custom contracts?",
    answer:
      "Yes, Enterprise customers can work with our sales team to create custom contracts with volume discounts, custom SLAs, and dedicated infrastructure. Contact our sales team to discuss your specific requirements.",
  },
  {
    question: "How does the 99.9% uptime SLA work?",
    answer:
      "Our SLA guarantees 99.9% monthly uptime for Pro plans and 99.99% for Enterprise. If we fall below this threshold, you'll receive service credits on your account. You can monitor our real-time status at status.shipfast.dev and view our historical uptime reports.",
  },
  {
    question: "What integrations do you support?",
    answer:
      "We integrate with GitHub, GitLab, Bitbucket, Slack, Discord, Jira, Linear, Datadog, Sentry, and 50+ other tools. Our API and webhooks let you build custom integrations for anything we don't natively support.",
  },
  {
    question: "Can I host on-premises?",
    answer:
      "Enterprise customers have the option for on-premises or hybrid deployments. We support deployment in your own VPC, AWS, GCP, or Azure environments. Contact our enterprise team for architecture details and pricing.",
  },
];

export default define.page(function LandingPage() {
  return (
    <>
      <HeroSection />

      <Partial name="features-section">
        <Section id="features">
          <div class="text-center mb-16">
            <h2 class="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">
              Everything you need to{" "}
              <span class="bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">
                ship faster
              </span>
            </h2>
            <p class="text-base-content/60 text-lg max-w-2xl mx-auto">
              Purpose-built tools and infrastructure so you can focus on what
              matters — building great products.
            </p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <FeatureCard
                key={feature.title}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
              />
            ))}
          </div>
        </Section>
      </Partial>

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

      <Partial name="faq-section">
        <Section id="faq" dark>
          <div class="text-center mb-16">
            <h2 class="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">
              Frequently asked{" "}
              <span class="bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">
                questions
              </span>
            </h2>
            <p class="text-base-content/60 text-lg max-w-2xl mx-auto">
              Can't find what you're looking for?{" "}
              <a href="#contact" class="link link-primary">
                Contact our support team
              </a>
              .
            </p>
          </div>

          <FAQ items={faqItems} />
        </Section>
      </Partial>

      <Section class="bg-gradient-to-br from-brand-600 to-brand-800 text-white">
        <div class="text-center max-w-2xl mx-auto" id="cta">
          <h2 class="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4 text-white">
            Ready to ship faster?
          </h2>
          <p class="text-white/80 text-lg mb-8">
            Join 10,000+ developers who trust ShipFast. Start your 14-day free
            trial — no credit card required.
          </p>
          <NewsletterForm />
          <p class="text-white/50 text-xs mt-4">
            No spam. Unsubscribe at any time.
          </p>
        </div>
      </Section>

      <Section id="contact" dark>
        <div class="text-center mb-16">
          <h2 class="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">
            Get in{" "}
            <span class="bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">
              touch
            </span>
          </h2>
          <p class="text-base-content/60 text-lg max-w-2xl mx-auto">
            Have a question or want to learn more? Drop us a message and we'll
            get back to you within 24 hours.
          </p>
        </div>

        <ContactForm />
      </Section>
    </>
  );
});
