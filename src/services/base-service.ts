type RequestOptions = {
  headers?: HeadersInit;
  query?: Record<string, string | number | boolean | null | undefined>;
};

function buildUrl(url: string, query?: RequestOptions["query"]) {
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    params.append(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    throw new Error(`Request failed (${res.status}): ${bodyText || res.statusText}`);
  }
  const text = await res.text();
  try {
    return text ? (JSON.parse(text) as T) : (undefined as T);
  } catch {
    // If response is not JSON, return as text
    return text as unknown as T;
  }
}

export async function get<T>(url: string, options?: RequestOptions): Promise<T> {
  const target = buildUrl(url, options?.query);
  const res = await fetch(target, {
    method: "GET",
    headers: options?.headers,
  });
  return handleResponse<T>(res);
}

export async function post<T>(url: string, body?: unknown, options?: RequestOptions): Promise<T> {
  const target = buildUrl(url, options?.query);
  const isFormData = body instanceof FormData;
  const headers = new Headers(options?.headers);
  if (!isFormData && body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(target, {
    method: "POST",
    headers: Object.fromEntries(headers.entries()),
    body: isFormData ? (body as FormData) : body !== undefined ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(res);
}
