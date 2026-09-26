export class ApiError extends Error {
  constructor(
    public status: number,
    public type: string,
    public title: string,
    public detail?: string,
    public instance?: string,
    public errors?: Record<string, string[]>,
  ) {
    super(title);
  }

  static rateLimit(retryAfter: number, path: string): ApiError {
    return new ApiError(
      429,
      "https://api.example.com/problems/rate-limit",
      "Too Many Requests",
      `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
      path,
    );
  }

  toResponse(): Response {
    return Response.json(
      {
        type: this.type,
        title: this.title,
        status: this.status,
        detail: this.detail,
        instance: this.instance,
        errors: this.errors,
      },
      {
        status: this.status,
        headers: { "Content-Type": "application/problem+json" },
      },
    );
  }
}
