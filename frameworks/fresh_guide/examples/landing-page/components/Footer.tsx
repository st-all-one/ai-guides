export function Footer() {
  return (
    <footer class="bg-base-200 border-t border-base-300">
      <div class="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-16">
        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          <div class="col-span-2 lg:col-span-2">
            <a href="/" class="text-xl font-bold tracking-tight inline-block mb-4">
              <span class="bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">
                ShipFast
              </span>
            </a>
            <p class="text-base-content/60 text-sm max-w-xs">
              The developer platform that helps you ship faster. Build, deploy, and scale with confidence.
            </p>
            <div class="flex gap-4 mt-6">
              <a href="#" class="btn btn-ghost btn-circle btn-sm" aria-label="Twitter">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>
              </a>
              <a href="#" class="btn btn-ghost btn-circle btn-sm" aria-label="GitHub">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
              </a>
              <a href="#" class="btn btn-ghost btn-circle btn-sm" aria-label="LinkedIn">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
              </a>
            </div>
          </div>

          <div>
            <h3 class="font-semibold text-sm mb-4">Product</h3>
            <ul class="space-y-2">
              <li><a href="#" class="text-sm text-base-content/60 hover:text-base-content transition-colors">Features</a></li>
              <li><a href="#" class="text-sm text-base-content/60 hover:text-base-content transition-colors">Pricing</a></li>
              <li><a href="#" class="text-sm text-base-content/60 hover:text-base-content transition-colors">Changelog</a></li>
            </ul>
          </div>

          <div>
            <h3 class="font-semibold text-sm mb-4">Company</h3>
            <ul class="space-y-2">
              <li><a href="#" class="text-sm text-base-content/60 hover:text-base-content transition-colors">About</a></li>
              <li><a href="#" class="text-sm text-base-content/60 hover:text-base-content transition-colors">Blog</a></li>
              <li><a href="#" class="text-sm text-base-content/60 hover:text-base-content transition-colors">Careers</a></li>
            </ul>
          </div>

          <div>
            <h3 class="font-semibold text-sm mb-4">Legal</h3>
            <ul class="space-y-2">
              <li><a href="#" class="text-sm text-base-content/60 hover:text-base-content transition-colors">Privacy</a></li>
              <li><a href="#" class="text-sm text-base-content/60 hover:text-base-content transition-colors">Terms</a></li>
            </ul>
          </div>
        </div>

        <div class="border-t border-base-300 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p class="text-sm text-base-content/50">
            &copy; {new Date().getFullYear()} ShipFast. All rights reserved.
          </p>
          <p class="text-sm text-base-content/50">
            Made with Fresh + Deno
          </p>
        </div>
      </div>
    </footer>
  );
}
