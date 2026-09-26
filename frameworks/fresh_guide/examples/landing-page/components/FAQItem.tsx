interface FAQItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}

export function FAQItem({ question, answer, isOpen, onToggle }: FAQItemProps) {
  return (
    <div class="border border-base-200 rounded-xl overflow-hidden transition-colors duration-200">
      <button
        type="button"
        class="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-base-200/50 transition-colors duration-200"
        onClick={onToggle}
      >
        <span class="font-medium text-base pr-4">{question}</span>
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
            isOpen ? "rotate-180" : ""
          }`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <div
        class={`grid transition-all duration-300 ease-in-out ${
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div class="overflow-hidden">
          <div class="px-6 pb-5 text-sm text-base-content/60 leading-relaxed">
            {answer}
          </div>
        </div>
      </div>
    </div>
  );
}
