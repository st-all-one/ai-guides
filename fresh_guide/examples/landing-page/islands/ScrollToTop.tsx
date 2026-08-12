import { useSignal, useEffect } from "preact/hooks";

export function ScrollToTop() {
  const visible = useSignal(false);

  useEffect(() => {
    const handleScroll = () => {
      visible.value = window.scrollY > 300;
    };

    globalThis.addEventListener("scroll", handleScroll, { passive: true });
    return () => globalThis.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    globalThis.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      type="button"
      class={`fixed bottom-6 right-6 z-50 btn btn-circle btn-primary shadow-lg transition-all duration-300 ${
        visible.value
          ? "opacity-100 translate-y-0 scale-100"
          : "opacity-0 translate-y-4 scale-90 pointer-events-none"
      }`}
      onClick={scrollToTop}
      aria-label="Scroll to top"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>
    </button>
  );
}
