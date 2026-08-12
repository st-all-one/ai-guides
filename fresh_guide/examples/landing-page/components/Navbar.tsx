import { MobileMenu } from "@/islands/MobileMenu.tsx";

const links = [
  { label: "Home", href: "#hero" },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "FAQ", href: "#faq" },
  { label: "Contact", href: "#contact" },
];

export function Navbar() {
  return (
    <nav class="navbar bg-base-100/80 backdrop-blur-lg border-b border-base-200 fixed top-0 left-0 right-0 z-50 h-16">
      <div class="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl w-full">
        <div class="flex-1">
          <a href="/" class="text-xl font-bold tracking-tight" f-partial="/partials/pricing">
            <span class="bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">
              ShipFast
            </span>
          </a>
        </div>

        <div class="hidden lg:flex items-center gap-1">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              class="btn btn-ghost btn-sm text-sm font-medium"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div class="hidden lg:flex items-center ml-4">
          <a href="#cta" class="btn btn-primary btn-sm">
            Get Started
          </a>
        </div>

        <div class="lg:hidden">
          <MobileMenu links={links} />
        </div>
      </div>
    </nav>
  );
}
