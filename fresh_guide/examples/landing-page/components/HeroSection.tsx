import { AnimatedCounter } from "@/islands/AnimatedCounter.tsx";

const stats = [
  { label: "developers", value: 10000, suffix: "+" },
  { label: "uptime", value: 99.9, suffix: "%" },
  { label: "requests served", value: 50, suffix: "M+" },
];

export function HeroSection() {
  return (
    <section
      id="hero"
      class="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-base-100 via-brand-50/20 to-base-100"
    >
      <div class="absolute inset-0 overflow-hidden pointer-events-none">
        <div class="absolute -top-40 -right-40 w-96 h-96 bg-brand-400/10 rounded-full blur-3xl" />
        <div class="absolute -bottom-40 -left-40 w-96 h-96 bg-brand-600/5 rounded-full blur-3xl" />
        <div class="absolute top-1/4 left-1/2 w-64 h-64 bg-brand-300/5 rounded-full blur-3xl" />
      </div>

      <div class="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl relative pt-20 pb-20">
        <div class="flex flex-col items-center text-center max-w-3xl mx-auto">
          <div class="badge badge-primary badge-outline gap-1 mb-6 px-4 py-3 animate-fade-in">
            <span class="w-2 h-2 rounded-full bg-success animate-pulse" />
            New: Version 3.0 just launched
          </div>

          <h1 class="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight mb-6 animate-slide-up animate-delay-100">
            Build Faster with{" "}
            <span class="bg-gradient-to-r from-brand-600 via-brand-500 to-brand-400 bg-clip-text text-transparent">
              ShipFast
            </span>
          </h1>

          <p class="text-lg sm:text-xl text-base-content/60 max-w-2xl mb-10 leading-relaxed animate-slide-up animate-delay-200">
            The all-in-one developer platform that streamlines your workflow.
            Deploy globally, scale effortlessly, and ship features 10x faster
            with our battle-tested infrastructure.
          </p>

          <div class="flex flex-col sm:flex-row gap-4 mb-16 animate-slide-up animate-delay-300">
            <a href="#cta" class="btn btn-primary btn-lg animate-pulse-glow">
              Get Started Free
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </a>
            <a href="#features" class="btn btn-outline btn-lg">
              View Demo
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </a>
          </div>

          <div class="animate-slide-up animate-delay-500 w-full">
            <AnimatedCounter stats={stats} />
          </div>
        </div>
      </div>

      <div class="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce hidden sm:block">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-base-content/30" aria-hidden="true"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>
      </div>
    </section>
  );
}
