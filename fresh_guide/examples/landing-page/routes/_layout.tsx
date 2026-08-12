import { define } from "@/utils/define.ts";
import { Navbar } from "@/components/Navbar.tsx";
import { Footer } from "@/components/Footer.tsx";
import { SkipLink } from "@/components/SkipLink.tsx";
import { ScrollToTop } from "@/islands/ScrollToTop.tsx";

export default define.layout(function Layout({ Component }) {
  return (
    <div class="min-h-screen flex flex-col">
      <SkipLink />
      <Navbar />
      <main id="main-content" class="flex-1">
        <Component />
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  );
});
