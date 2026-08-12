import { useSignal, useRef, useEffect } from "preact/hooks";

interface Stat {
  label: string;
  value: number;
  suffix?: string;
}

interface AnimatedCounterProps {
  stats: Stat[];
}

function formatNumber(num: number): string {
  if (num >= 1000) {
    return num.toLocaleString("en-US");
  }
  if (num % 1 !== 0) {
    return num.toFixed(1);
  }
  return num.toString();
}

export function AnimatedCounter({ stats }: AnimatedCounterProps) {
  const counts = stats.map(() => useSignal(0));
  const triggered = useSignal(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !triggered.value) {
          triggered.value = true;

          if (
            typeof window !== "undefined" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ) {
            stats.forEach((stat, i) => {
              counts[i].value = stat.value;
            });
            return;
          }

          stats.forEach((stat, i) => {
            const duration = 2000;
            const startTime = performance.now();
            const startValue = 0;
            const endValue = stat.value;

            function animate(currentTime: number) {
              const elapsed = currentTime - startTime;
              const progress = Math.min(elapsed / duration, 1);
              const eased = 1 - Math.pow(1 - progress, 3);
              const current = startValue + (endValue - startValue) * eased;
              counts[i].value = current;

              if (progress < 1) {
                requestAnimationFrame(animate);
              }
            }

            requestAnimationFrame(animate);
          });
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={sectionRef}
      class="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 w-full"
    >
      {stats.map((stat, i) => (
        <div
          key={stat.label}
          class="flex flex-col items-center p-4 animate-count-in"
          style={`animation-delay: ${i * 150}ms`}
        >
          <span class="text-3xl sm:text-4xl font-extrabold text-brand-600 tabular-nums">
            {formatNumber(counts[i].value)}
            {stat.suffix}
          </span>
          <span class="text-sm text-base-content/50 mt-1 capitalize">
            {stat.label}
          </span>
        </div>
      ))}
    </div>
  );
}
