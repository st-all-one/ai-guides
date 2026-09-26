import { useSignal } from "@preact/signals";

interface Link {
  label: string;
  href: string;
}

interface MobileMenuProps {
  links: Link[];
}

export function MobileMenu({ links }: MobileMenuProps) {
  const isOpen = useSignal(false);

  return (
    <>
      <button
        type="button"
        class="btn btn-ghost btn-circle"
        onClick={() => (isOpen.value = !isOpen.value)}
        aria-label="Toggle navigation menu"
        aria-expanded={isOpen.value}
        aria-controls="mobile-menu"
      >
        {isOpen.value ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        )}
      </button>

      <div
        id="mobile-menu"
        role="dialog"
        aria-modal={isOpen.value ? "true" : undefined}
        class={`fixed inset-0 z-40 transition-opacity duration-300 ${
          isOpen.value ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <div
          class="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => (isOpen.value = false)}
        />

        <div
          class={`absolute top-0 right-0 h-full w-72 bg-base-100 shadow-2xl transition-transform duration-300 ease-out ${
            isOpen.value ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div class="flex items-center justify-between p-4 border-b border-base-200">
            <span class="text-xl font-bold">
              <span class="bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">
                ShipFast
              </span>
            </span>
            <button
              type="button"
              class="btn btn-ghost btn-circle btn-sm"
              onClick={() => (isOpen.value = false)}
              aria-label="Close menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>

          <nav class="flex flex-col p-4 gap-1">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                class="btn btn-ghost justify-start text-base font-medium"
                onClick={() => (isOpen.value = false)}
              >
                {link.label}
              </a>
            ))}
            <div class="mt-4">
              <a
                href="#cta"
                class="btn btn-primary w-full"
                onClick={() => (isOpen.value = false)}
              >
                Get Started
              </a>
            </div>
          </nav>
        </div>
      </div>
    </>
  );
}
