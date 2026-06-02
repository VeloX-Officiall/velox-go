import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/lib/auth";

/**
 * Customer/general lifecycle presence: status='online' while tab is visible,
 * 'offline' on hide/unload. Skipped for couriers (manual gating) and stores (manual toggle).
 */
export function useAppPresence(enabled: boolean) {
  const { user } = useAuthSession();
  useEffect(() => {
    if (!enabled || !user) return;
    const set = async (status: "online" | "offline") => {
      await supabase.from("profiles").update({
        status,
        is_online: status === "online",
        last_seen_at: new Date().toISOString(),
      } as never).eq("id", user.id);
    };
    set("online");
    const onVis = () => set(document.visibilityState === "visible" ? "online" : "offline");
    const onLeave = () => set("offline");
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("beforeunload", onLeave);
      set("offline");
    };
  }, [enabled, user?.id]);
}
