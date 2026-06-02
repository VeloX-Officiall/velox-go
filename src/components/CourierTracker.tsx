import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Bike } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const bikeIcon = L.divIcon({
  className: "",
  html: `<div style="background:hsl(var(--primary));color:white;border-radius:9999px;padding:6px;box-shadow:0 4px 12px rgba(0,0,0,.3)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6h3.5L19 9.5 14.5 12 12 17.5"/></svg></div>`,
  iconSize: [28, 28], iconAnchor: [14, 14],
});

function Recenter({ pos }: { pos: [number, number] | null }) {
  const map = useMap();
  useEffect(() => { if (pos) map.setView(pos, map.getZoom()); }, [pos?.[0], pos?.[1]]);
  return null;
}

export function CourierTracker({ courierId }: { courierId: string }) {
  const [pos, setPos] = useState<[number, number] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchLast = async () => {
      const { data } = await supabase.from("courier_locations")
        .select("lat,lng").eq("courier_id", courierId)
        .order("recorded_at", { ascending: false }).limit(1);
      if (!cancelled && data && data[0]) setPos([data[0].lat as number, data[0].lng as number]);
    };
    fetchLast();
    const ch = supabase.channel(`track-${courierId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "courier_locations", filter: `courier_id=eq.${courierId}` },
        (payload) => {
          const r = payload.new as { lat: number; lng: number };
          setPos([r.lat, r.lng]);
        })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [courierId]);

  if (!pos) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border bg-accent/10 text-xs text-muted-foreground">
        <Bike className="mr-2 h-4 w-4 text-primary" /> Kuryer mövqeyi gözlənilir...
      </div>
    );
  }

  return (
    <div className="h-56 overflow-hidden rounded-2xl border border-border">
      <MapContainer center={pos} zoom={15} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OSM" />
        <Marker position={pos} icon={bikeIcon} />
        <Recenter pos={pos} />
      </MapContainer>
    </div>
  );
}
