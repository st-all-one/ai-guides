import { useSignal, useEffect, useRef } from "preact/hooks";

interface Testimonial {
  name: string;
  role: string;
  company: string;
  quote: string;
  rating: number;
}

interface TestimonialCarouselProps {
  testimonials: Testimonial[];
}

export function TestimonialCarousel({ testimonials }: TestimonialCarouselProps) {
  const current = useSignal(0);
  const isPaused = useSignal(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = (index: number) => {
    current.value = index;
  };

  const prev = () => {
    current.value = current.value === 0
      ? testimonials.length - 1
      : current.value - 1;
  };

  const next = () => {
    current.value = current.value === testimonials.length - 1
      ? 0
      : current.value + 1;
  };

  useEffect(() => {
    if (
      isPaused.value ||
      (typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    ) {
      return;
    }

    intervalRef.current = setInterval(() => {
      next();
    }, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPaused.value, current.value]);

  const t = testimonials[current.value];

  return (
    <div
      class="max-w-2xl mx-auto"
      onMouseEnter={() => (isPaused.value = true)}
      onMouseLeave={() => (isPaused.value = false)}
    >
      <div class="card bg-base-100 border border-base-200 shadow-sm p-6 sm:p-8 relative overflow-hidden">
        <div class="flex gap-1 mb-4">
          {Array.from({ length: 5 }, (_, i) => (
            <svg
              key={i}
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill={i < t.rating ? "currentColor" : "none"}
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class={i < t.rating ? "text-warning" : "text-base-content/20"}
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          ))}
        </div>

        <blockquote class="text-base-content/70 text-sm leading-relaxed mb-6 italic">
          "{t.quote}"
        </blockquote>

        <div class="flex items-center gap-3">
          <div class="avatar placeholder">
            <div class="bg-brand-100 text-brand-700 rounded-full w-10 h-10 flex items-center justify-center text-sm font-bold">
              {t.name.split(" ").map((n) => n[0]).join("")}
            </div>
          </div>
          <div>
            <p class="font-semibold text-sm">{t.name}</p>
            <p class="text-xs text-base-content/50">
              {t.role}, {t.company}
            </p>
          </div>
        </div>

        <div class="absolute top-4 right-4 text-6xl text-base-content/5 select-none leading-none">
          &ldquo;
        </div>
      </div>

      <div class="flex items-center justify-center gap-4 mt-6">
        <button
          type="button"
          class="btn btn-circle btn-ghost btn-sm"
          onClick={prev}
          aria-label="Previous testimonial"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>

        <div class="flex gap-2">
          {testimonials.map((_, i) => (
            <button
              key={i}
              type="button"
              class={`w-2 h-2 rounded-full transition-all duration-300 ${
                i === current.value
                  ? "bg-brand-600 w-6"
                  : "bg-base-300 hover:bg-base-400"
              }`}
              onClick={() => goTo(i)}
              aria-label={`Go to testimonial ${i + 1}`}
            />
          ))}
        </div>

        <button
          type="button"
          class="btn btn-circle btn-ghost btn-sm"
          onClick={next}
          aria-label="Next testimonial"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </button>
      </div>
    </div>
  );
}
