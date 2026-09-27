export type ApiError = {
  code: string;
  message: string;
  details?: { path: string; message: string }[];
};

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly error: ApiError,
  ) {
    super(error.message);
    this.name = "ApiRequestError";
  }
}

// Single fetch wrapper for the whole app. Talks to the same-origin /api proxy,
// always sends the cookie, and turns error responses into a typed error.
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const body = res.status === 204 ? null : await res.json().catch(() => null);

  if (!res.ok) {
    const error: ApiError = body?.error ?? { code: "UNKNOWN", message: "Request failed" };
    throw new ApiRequestError(res.status, error);
  }

  return body as T;
}
