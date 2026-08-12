import { define } from "@/utils/define.ts";

export default define.page(function ErrorPage() {
  return (
    <div class="min-h-[60vh] flex items-center justify-center px-4">
      <div class="text-center max-w-md">
        <div class="text-8xl mb-6 animate-bounce">&#x1f6e0;&#xfe0f;</div>
        <h1 class="text-3xl font-bold mb-4">Oops! Something went wrong</h1>
        <p class="text-base-content/60 mb-8 leading-relaxed">
          We couldn't find the page you're looking for or something went wrong
          on our end. Let's get you back on track.
        </p>
        <a href="/" class="btn btn-primary btn-lg">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          Back to Home
        </a>
      </div>
    </div>
  );
});
