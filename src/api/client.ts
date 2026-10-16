import { getLang } from "../i18n/lang";

/** Backend base URL (/api/v1 ke saath). .env: VITE_API_BASE_URL */
export const API_BASE: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") || "https://cabbie.onrender.com/api/v1";

const ACCESS_KEY = "dl_admin_access";
const REFRESH_KEY = "dl_admin_refresh";

export const tokens = {
  get access() {
    return localStorage.getItem(ACCESS_KEY) || "";
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY) || "";
  },
  set(access: string, refresh: string) {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Backend ka response envelope: { status, message, data, pagination? } */
export interface Envelope<T> {
  status: "SUCCESS" | "FAILED";
  message: string;
  data: T;
  pagination?: Pagination;
}

export interface Paged<T> {
  items: T[];
  pagination: Pagination;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** Session khatam (refresh bhi fail) → AuthProvider logout karta hai */
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null) {
  onUnauthorized = fn;
}

export type Query = Record<string, string | number | boolean | null | undefined>;

function buildUrl(path: string, query?: Query) {
  const url = API_BASE + path;
  if (!query) return url;
  const qs = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    qs.set(k, String(v));
  });
  const s = qs.toString();
  return s ? `${url}?${s}` : url;
}

let refreshing: Promise<boolean> | null = null;

/** Ek hi refresh chale, chahe kai requests ek saath 401 laayein */
async function refreshAccessToken(): Promise<boolean> {
  if (!tokens.refresh) return false;
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const res = await fetch(buildUrl("/auth/refresh"), {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ refreshToken: tokens.refresh }),
        });
        if (!res.ok) return false;
        const json = (await res.json()) as Envelope<{ accessToken: string; refreshToken: string }>;
        if (!json.data?.accessToken) return false;
        tokens.set(json.data.accessToken, json.data.refreshToken || tokens.refresh);
        return true;
      } catch {
        return false;
      } finally {
        setTimeout(() => (refreshing = null), 0);
      }
    })();
  }
  return refreshing;
}

interface RequestOptions {
  query?: Query;
  body?: unknown;
  auth?: boolean;
}

export async function request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<Envelope<T>> {
  const { query, body, auth = true } = opts;

  const doFetch = () => {
    const headers: Record<string, string> = {
      Accept: "application/json",
      // backend messages isi language me lautata hai
      "Accept-Language": getLang(),
    };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (auth && tokens.access) headers.Authorization = `Bearer ${tokens.access}`;
    return fetch(buildUrl(path, query), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  };

  let res: Response;
  try {
    res = await doFetch();
    if (res.status === 401 && auth && tokens.refresh) {
      const ok = await refreshAccessToken();
      if (ok) {
        res = await doFetch();
      } else {
        onUnauthorized?.();
        throw new ApiError("Session expired. Please login again.", 401);
      }
    }
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError("Network error. Please check your internet and try again.", 0);
  }

  let json: Envelope<T> | null = null;
  try {
    json = (await res.json()) as Envelope<T>;
  } catch {
    json = null;
  }

  if (!res.ok || json?.status === "FAILED") {
    if (res.status === 401 && auth) onUnauthorized?.();
    throw new ApiError(json?.message || defaultMessage(res.status), res.status);
  }
  return json as Envelope<T>;
}

function defaultMessage(status: number) {
  if (status === 404) return "Not found (404). Please check VITE_API_BASE_URL.";
  if (status >= 500) return `Server error (${status}). Please try again.`;
  return `Request failed (${status}).`;
}

export const http = {
  /** sirf data */
  async get<T>(path: string, query?: Query): Promise<T> {
    return (await request<T>("GET", path, { query })).data;
  },
  /** list + pagination */
  async paged<T>(path: string, query?: Query): Promise<Paged<T>> {
    const env = await request<T[]>("GET", path, { query });
    const items = Array.isArray(env.data) ? env.data : [];
    return {
      items,
      pagination: env.pagination || { page: 1, limit: items.length, total: items.length, totalPages: 1 },
    };
  },
  post<T = unknown>(path: string, body?: unknown, query?: Query) {
    return request<T>("POST", path, { body: body ?? {}, query });
  },
  put<T = unknown>(path: string, body?: unknown) {
    return request<T>("PUT", path, { body: body ?? {} });
  },
  patch<T = unknown>(path: string, body?: unknown) {
    return request<T>("PATCH", path, { body: body ?? {} });
  },
  del<T = unknown>(path: string) {
    return request<T>("DELETE", path);
  },
};

export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return "Something went wrong";
}
