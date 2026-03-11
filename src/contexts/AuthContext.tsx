import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  companyId: string | null;
  signUp: (email: string, password: string, companyName: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const fetchCompanyId = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) {
      setCompanyId(null);
      return;
    }

    setCompanyId(data.company_id);
  };

  useEffect(() => {
    let isMounted = true;

    const syncSessionState = async (nextSession: Session | null) => {
      if (!isMounted) return;

      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        await fetchCompanyId(nextSession.user.id);
      } else {
        setCompanyId(null);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void syncSessionState(nextSession);
    });

    const initializeAuth = async () => {
      setLoading(true);

      const { data: sessionData } = await supabase.auth.getSession();
      await syncSessionState(sessionData.session ?? null);

      const expiresAt = sessionData.session?.expires_at;
      if (expiresAt && expiresAt * 1000 <= Date.now() + 60_000) {
        const { data: refreshedData } = await supabase.auth.refreshSession();
        await syncSessionState(refreshedData.session ?? null);
      }

      if (isMounted) setLoading(false);
    };

    const recoverSessionOnFocus = () => {
      if (document.visibilityState !== "visible") return;
      void supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          void syncSessionState(data.session);
        }
      });
    };

    void initializeAuth();
    document.addEventListener("visibilitychange", recoverSessionOnFocus);
    window.addEventListener("focus", recoverSessionOnFocus);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", recoverSessionOnFocus);
      window.removeEventListener("focus", recoverSessionOnFocus);
    };
  }, []);

  const signUp = async (email: string, password: string, companyName: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { company_name: companyName, full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setCompanyId(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, companyId, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
