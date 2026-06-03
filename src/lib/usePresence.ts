import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/lib/auth";

/**
 * Marks the current user as online via a heartbeat that updates profiles.is_online + last_seen_at.
 * Marks offline on unmount and on `beforeunload`.
 */
let hbUserId: string | null = null;
let hbStarted = false;
async function setOnlineOnce(userId: string, online: boolean) {
  await supabase.from("profiles")
    .update({ is_online: online, last_seen_at: new Date().toISOString() } as never)
    .eq("id", userId);
}
export function usePresenceHeartbeat() {
  const { user } = useAuthSession();
  useEffect(() => {
    if (!user) return;
    if (hbStarted && hbUserId === user.id) return;
    hbStarted = true; hbUserId = user.id;
    setOnlineOnce(user.id, true);
    const interval = setInterval(() => { if (hbUserId) setOnlineOnce(hbUserId, true); }, 60_000);
    const onLeave = () => { if (hbUserId) setOnlineOnce(hbUserId, false); };
    window.addEventListener("beforeunload", onLeave);
    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", onLeave);
      hbStarted = false;
    };
  }, [user?.id]);
}

/**
 * Returns the number of users currently marked online (optionally filtered by role).
 * Subscribes to realtime changes on profiles.
 */
export function useOnlineCount(role?: "courier" | "store" | "customer") {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (role) {
      // join via user_roles
      const { data: roleRows } = await supabase
        .from("user_roles").select("user_id").eq("role", role);
      const ids = (roleRows || []).map((r: { user_id: string }) => r.user_id);
      if (ids.length === 0) { setCount(0); return; }
      const { count: c } = await supabase
        .from("profiles").select("id", { count: "exact", head: true })
        .eq("is_online", true).in("id", ids);
      setCount(c || 0);
    } else {
      const { count: c } = await supabase
        .from("profiles").select("id", { count: "exact", head: true })
        .eq("is_online", true);
      setCount(c || 0);
    }
  }, [role]);

  useEffect(() => {
    refresh();
    const ch = supabase.channel(`presence-${role || "all"}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, () => refresh())
      .subscribe();
    const id = setInterval(refresh, 30_000);
    return () => { supabase.removeChannel(ch); clearInterval(id); };
  }, [refresh]);

  return count;
}
