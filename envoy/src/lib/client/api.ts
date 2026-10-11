export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function api<T = unknown>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { ...(init?.json !== undefined ? { "content-type": "application/json" } : {}), ...init?.headers },
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
  });
  const text = await res.text();
  let data: { error?: string } | null = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // Hosting errors (for example Vercel's 4.5 MB request limit) come back as plain text, not JSON.
  }
  if (!res.ok) {
    const fallback =
      res.status === 413
        ? "That upload is too large to save. Use a PDF under 3 MB."
        : res.status === 401
          ? "You've been signed out. Sign in again, then save."
          : `Something went wrong (${res.status}). Try again.`;
    throw new ApiError(res.status, data?.error || fallback);
  }
  return data as T;
}

export const fileToBase64 = (f: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(r.error);
    r.readAsDataURL(f);
  });
