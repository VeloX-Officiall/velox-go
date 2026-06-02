import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/lib/auth";

/**
 * Streams the courier's geolocation into `courier_locations` every 10s
 * while the courier is online (day pass active).
 */
export function useCourierTracking(active: boolean) {
  const { user } = useAuthSession();
  useEffect(() => {
    if (!active || !user || typeof navigator === "undefined" || !navigator.geolocation) return;
    let stopped = false;
    const push = () => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          if (stopped) return;
          await supabase.from("courier_locations").insert({
            courier_id: user.id,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          } as never);
        },
        () => {/* ignore */},
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 5000 },
      );
    };
    push();
    const id = setInterval(push, 10_000);
    return () => { stopped = true; clearInterval(id); };
  }, [active, user?.id]);
}
