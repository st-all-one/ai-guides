import { HttpError } from "fresh";

export default function ErrorPage({ error }: { error: unknown }) {
  if (error instanceof HttpError) {
    const status = error.status;
    const message = error.message;

    if (status === 404) {
      return (
        <div class="min-h-screen flex items-center justify-center p-4">
          <div class="text-center max-w-md">
            <div class="text-8xl font-bold text-primary mb-4">404</div>
            <h1 class="text-2xl font-bold mb-2">Page Not Found</h1>
            <p class="text-base-content/60 mb-6">
              {message || "The page you are looking for does not exist."}
            </p>
            <a href="/admin" class="btn btn-primary">
              Back to Dashboard
            </a>
          </div>
        </div>
      );
    }

    if (status === 403) {
      return (
        <div class="min-h-screen flex items-center justify-center p-4">
          <div class="text-center max-w-md">
            <div class="text-8xl font-bold text-error mb-4">403</div>
            <h1 class="text-2xl font-bold mb-2">Access Denied</h1>
            <p class="text-base-content/60 mb-6">
              {message || "You do not have permission to access this page."}
            </p>
            <a href="/admin" class="btn btn-primary">
              Back to Dashboard
            </a>
          </div>
        </div>
      );
    }
  }

  return (
    <div class="min-h-screen flex items-center justify-center p-4">
      <div class="text-center max-w-md">
        <div class="text-8xl font-bold text-warning mb-4">500</div>
        <h1 class="text-2xl font-bold mb-2">Internal Server Error</h1>
        <p class="text-base-content/60 mb-6">
          Something went wrong on our end. Please try again later.
        </p>
        <a href="/admin" class="btn btn-primary">
          Back to Dashboard
        </a>
      </div>
    </div>
  );
}
