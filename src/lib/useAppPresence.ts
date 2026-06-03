import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/lib/auth";

let lastUserId: string | null = null;
let lastStatus: "online" | "offline" | null = null;

async function writeStatus(userId: string, status: "online" | "offline") {
  if (lastUserId === userId && lastStatus === status) return;
  lastUserId = userId; lastStatus = status;
  await supabase.from("profiles").update({
    status,
    is_online: status === "online",
    last_seen_at: new Date().toISOString(),
  } as never).eq("id", userId);
}

/**
 * Sets status='online' once per session. Marks offline only on tab hide/unload.
 * Does NOT toggle on every component unmount (route change).
 */
export function useAppPresence(enabled: boolean) {
  const { user } = useAuthSession();
  useEffect(() => {
    if (!enabled || !user) return;
    writeStatus(user.id, "online");
    const onVis = () => writeStatus(user.id, document.visibilityState === "visible" ? "online" : "offline");
    const onLeave = () => writeStatus(user.id, "offline");
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("beforeunload", onLeave);
    };
  }, [enabled, user?.id]);
}
