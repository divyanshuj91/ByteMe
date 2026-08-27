export const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:4000";

/**
 * Helper to fetch from backend Express API with fallback
 */
export async function fetchBackend(endpoint: string, options: RequestInit = {}) {
  const url = `${BACKEND_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      cache: "no-store",
    });
    return res;
  } catch (error) {
    console.warn(`[Backend API] Failed to connect to ${url}:`, error);
    return null;
  }
}
