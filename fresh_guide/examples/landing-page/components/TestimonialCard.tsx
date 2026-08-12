interface TestimonialCardProps {
  name: string;
  role: string;
  company: string;
  avatar: string;
  quote: string;
  rating: number;
}

export function TestimonialCard({
  name,
  role,
  company,
  avatar,
  quote,
  rating,
}: TestimonialCardProps) {
  return (
    <div class="card bg-base-100 border border-base-200 shadow-sm p-6 sm:p-8">
      <div class="flex gap-1 mb-4">
        {Array.from({ length: 5 }, (_, i) => (
          <svg
            key={i}
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill={i < rating ? "currentColor" : "none"}
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class={i < rating ? "text-warning" : "text-base-content/20"}
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        ))}
      </div>

      <blockquote class="text-base-content/70 text-sm leading-relaxed mb-6 italic">
        "{quote}"
      </blockquote>

      <div class="flex items-center gap-3 mt-auto">
        <div class="avatar placeholder">
          <div class="bg-brand-100 text-brand-700 rounded-full w-10 h-10 flex items-center justify-center text-sm font-bold">
            {name.split(" ").map((n) => n[0]).join("")}
          </div>
        </div>
        <div>
          <p class="font-semibold text-sm">{name}</p>
          <p class="text-xs text-base-content/50">
            {role}, {company}
          </p>
        </div>
      </div>
    </div>
  );
}
