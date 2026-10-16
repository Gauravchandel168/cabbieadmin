import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { authApi } from "../api/api";
import { ApiError, setUnauthorizedHandler, tokens } from "../api/client";
import type { UserPublic } from "../api/types";

const USER_KEY = "dl_admin_user";
export const ONLY_SUPER_ADMIN = "ONLY_SUPER_ADMIN";

interface AuthCtx {
  user: UserPublic | null;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({ user: null, login: async () => {}, logout: async () => {} });

function readUser(): UserPublic | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw && tokens.access ? (JSON.parse(raw) as UserPublic) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserPublic | null>(readUser);

  const clearLocal = useCallback(() => {
    tokens.clear();
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(clearLocal);
    return () => setUnauthorizedHandler(null);
  }, [clearLocal]);

  const login = useCallback(async (phone: string, password: string) => {
    const res = await authApi.signIn(phone.trim(), password);
    const d = res.data;
    // Sirf super admin — agency / driver ka session turant band
    if (d.user.role !== "super_admin") {
      tokens.set(d.accessToken, d.refreshToken);
      await authApi.signOut(d.refreshToken).catch(() => undefined);
      tokens.clear();
      throw new ApiError(ONLY_SUPER_ADMIN, 403);
    }
    tokens.set(d.accessToken, d.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(d.user));
    setUser(d.user);
  }, []);

  const logout = useCallback(async () => {
    const rt = tokens.refresh;
    if (rt) await authApi.signOut(rt).catch(() => undefined);
    clearLocal();
  }, [clearLocal]);

  return <Ctx.Provider value={{ user, login, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
