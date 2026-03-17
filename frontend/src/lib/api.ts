// frontend/src/lib/api.ts

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// Helper to build headers with JWT token
function buildHeaders(json = true): HeadersInit {
  const token = localStorage.getItem("token");

  return {
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// Shared response handler
async function handleResponse<T>(res: Response): Promise<T> {
  const text = await res.text();

  if (!res.ok) {
    throw new Error(text || "Request failed");
  }

  try {
    return JSON.parse(text);
  } catch {
    // some endpoints may return empty body
    return {} as T;
  }
}

/* ===============================
   GET
================================ */
export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "GET",
    headers: buildHeaders(false),
  });

  return handleResponse<T>(res);
}

/* ===============================
   POST
================================ */
export async function apiPost<T>(path: string, body: any): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: buildHeaders(true),
    body: JSON.stringify(body),
  });

  return handleResponse<T>(res);
}

/* ===============================
   PUT
================================ */
export async function apiPut<T>(path: string, body: any): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "PUT",
    headers: buildHeaders(true),
    body: JSON.stringify(body),
  });

  return handleResponse<T>(res);
}

/* ===============================
   DELETE
================================ */
export async function apiDelete<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "DELETE",
    headers: buildHeaders(false),
  });

  return handleResponse<T>(res);
}
