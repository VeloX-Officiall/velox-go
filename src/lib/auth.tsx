import { useEffect, useState } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export function useAuthSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, user: session?.user ?? null as User | null, loading };
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

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Yüklənir...
      </div>
    );
  }
  return <>{children}</>;
}

export async function signOut() {
  await supabase.auth.signOut();
  window.location.href = "/";
}
