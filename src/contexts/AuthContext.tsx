"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Whether Supabase env vars are present at build time. */
const SUPABASE_CONFIGURED = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(SUPABASE_CONFIGURED);

  useEffect(() => {
    if (!SUPABASE_CONFIGURED) return;

    // Dynamic import to avoid bundling supabase client when not configured
    import("@/lib/supabase/client").then(({ getSupabaseClient }) => {
      const supabase = getSupabaseClient();

      supabase.auth.getSession().then(({ data: { session: s } }) => {
        setSession(s);
        setUser(s?.user ?? null);
        setIsLoading(false);
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, s) => {
        setSession(s);
        setUser(s?.user ?? null);
      });

      return () => subscription.unsubscribe();
    });
  }, []);

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error?: string }> => {
      if (!SUPABASE_CONFIGURED) return { error: "Auth not configured" };

      const { getSupabaseClient } = await import("@/lib/supabase/client");
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) return { error: error.message };
      return {};
    },
    [],
  );

  const signUp = useCallback(
    async (email: string, password: string): Promise<{ error?: string }> => {
      if (!SUPABASE_CONFIGURED) return { error: "Auth not configured" };

      const { getSupabaseClient } = await import("@/lib/supabase/client");
      const supabase = getSupabaseClient();

      // 1. Create Supabase auth user
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) return { error: error.message };

      // 2. Create DB user row via API
      if (data.session) {
        await fetch("/api/auth/register", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${data.session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        });
      }

      return {};
    },
    [],
  );

  const signOut = useCallback(async () => {
    if (!SUPABASE_CONFIGURED) return;

    const { getSupabaseClient } = await import("@/lib/supabase/client");
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, session, isLoading, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

const NO_AUTH: AuthContextValue = {
  user: null,
  session: null,
  isLoading: false,
  signIn: async () => ({ error: "Auth not configured" }),
  signUp: async () => ({ error: "Auth not configured" }),
  signOut: async () => {},
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  // Return safe no-op default when provider is absent (e.g. in tests)
  return ctx ?? NO_AUTH;
}

/** Check if Supabase auth is available (env vars set). */
export function isAuthAvailable(): boolean {
  return SUPABASE_CONFIGURED;
}
