import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import * as api from "../api/client";

interface AuthState {
  token: string | null;
  user: api.User | null;
  memberships: api.Membership[];
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
    organization_name: string;
  }) => Promise<void>;
  logout: () => void;
  /** The organization the current user belongs to (this app assumes one org per user for simplicity). */
  currentOrganization: api.Organization | null;
  refreshMembership: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

const TOKEN_STORAGE_KEY = "grantflow_access_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  const [user, setUser] = useState<api.User | null>(null);
  const [memberships, setMemberships] = useState<api.Membership[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async (activeToken: string) => {
    const me = await api.fetchMe(activeToken);
    setUser(me.user);
    setMemberships(me.memberships);
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    loadMe(token)
      .catch(() => {
        // stale/invalid token
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        setToken(null);
      })
      .finally(() => setLoading(false));
  }, [token, loadMe]);

  const login = useCallback(async (email: string, password: string) => {
    const tokens = await api.login(email, password);
    localStorage.setItem(TOKEN_STORAGE_KEY, tokens.access);
    setToken(tokens.access);
    await loadMe(tokens.access);
  }, [loadMe]);

  const register = useCallback(
    async (payload: {
      email: string;
      password: string;
      first_name?: string;
      last_name?: string;
      organization_name: string;
    }) => {
      const result = await api.registerAccount(payload);
      localStorage.setItem(TOKEN_STORAGE_KEY, result.tokens.access);
      setToken(result.tokens.access);
      await loadMe(result.tokens.access);
    },
    [loadMe],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
    setMemberships([]);
  }, []);

  const refreshMembership = useCallback(async () => {
    if (token) await loadMe(token);
  }, [token, loadMe]);

  const currentOrganization = memberships[0]?.organization ?? null;

  const value = useMemo(
    () => ({ token, user, memberships, loading, login, register, logout, currentOrganization, refreshMembership }),
    [token, user, memberships, loading, login, register, logout, currentOrganization, refreshMembership],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
