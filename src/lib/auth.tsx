import { useEffect, useState, useSyncExternalStore } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

// ---- Singleton session store (avoids per-mount getSession round-trip) ----
type AuthState = { session: Session | null; loading: boolean };
let state: AuthState = { session: null, loading: true };
const listeners = new Set<() => void>();
let initialized = false;

function emit() { listeners.forEach((l) => l()); }
function setState(next: Partial<AuthState>) {
  state = { ...state, ...next };
  emit();
}

function ensureInit() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  supabase.auth.onAuthStateChange((_e, s) => setState({ session: s, loading: false }));
  supabase.auth.getSession().then(({ data }) => setState({ session: data.session, loading: false }));
}

const subscribe = (cb: () => void) => {
  ensureInit();
  listeners.add(cb);
  return () => { listeners.delete(cb); };
};
const getSnapshot = () => state;
const getServerSnapshot = () => ({ session: null, loading: true } as AuthState);

export function useAuthSession() {
  const s = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { session: s.session, user: s.session?.user ?? (null as User | null), loading: s.loading };
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuthSession();
  const navigate = useNavigate();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !session) {
      const path = router.state.location.pathname;
      navigate({ to: "/auth", search: { redirect: path } as never });
    }
  }, [loading, session, navigate, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Yüklənir...
      </div>
    );
  }
  if (!session) return null;
  return <>{children}</>;
}

export async function signOut() {
  await supabase.auth.signOut();
  window.location.href = "/";
}
