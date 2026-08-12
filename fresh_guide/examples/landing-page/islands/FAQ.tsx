import { useSignal } from "@preact/signals";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQProps {
  items: FAQItem[];
}

export function FAQ({ items }: FAQProps) {
  const openIndex = useSignal<number | null>(null);

  const toggle = (index: number) => {
    openIndex.value = openIndex.value === index ? null : index;
  };

  return (
    <div class="max-w-2xl mx-auto space-y-3">
      {items.map((item, index) => (
        <div
          key={index}
          class="border border-base-200 rounded-xl overflow-hidden transition-colors duration-200"
        >
          <button
            type="button"
            id={`faq-btn-${index}`}
            class="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-base-200/50 transition-colors duration-200"
            onClick={() => toggle(index)}
            aria-expanded={openIndex.value === index}
            aria-controls={`faq-panel-${index}`}
          >
            <span class="font-medium text-base pr-4">{item.question}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class={`shrink-0 transition-transform duration-300 text-base-content/40 ${
                openIndex.value === index ? "rotate-180" : ""
              }`}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          <div
            id={`faq-panel-${index}`}
            role="region"
            aria-labelledby={`faq-btn-${index}`}
            class={`grid transition-all duration-300 ease-in-out ${
              openIndex.value === index
                ? "grid-rows-[1fr] opacity-100"
                : "grid-rows-[0fr] opacity-0"
            }`}
          >
            <div class="overflow-hidden">
              <div class="px-6 pb-5 text-sm text-base-content/60 leading-relaxed">
                {item.answer}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
