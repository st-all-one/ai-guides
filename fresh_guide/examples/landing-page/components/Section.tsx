import type { ComponentChildren } from "preact";

interface SectionProps {
  id?: string;
  className?: string;
  children: ComponentChildren;
  dark?: boolean;
}

export function Section({ id, className = "", children, dark = false }: SectionProps) {
  return (
    <section
      id={id}
      class={`py-20 md:py-28 ${dark ? "bg-base-200" : "bg-base-100"} ${className}`}
    >
      <div class="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        {children}
      </div>
    </section>
  );
}
