import { useEffect, useRef, useState } from "react";

export type LatLng = { lat: number; lng: number };

export function MapPicker({
  pickup,
  dropoff,
  onChange,
  height = 280,
  center = { lat: 40.4093, lng: 49.8671 },
}: {
  pickup: LatLng | null;
  dropoff: LatLng | null;
  onChange: (next: { pickup: LatLng | null; dropoff: LatLng | null }) => void;
  height?: number;
  center?: LatLng;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layersRef = useRef<{ a: any; b: any; line: any; L: any }>({ a: null, b: null, line: null, L: null });
  const stateRef = useRef({ pickup, dropoff });
  stateRef.current = { pickup, dropoff };
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const Lmod = await import("leaflet");
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !containerRef.current) return;
      const L = (Lmod as any).default || Lmod;
      layersRef.current.L = L;
      const map = L.map(containerRef.current).setView([center.lat, center.lng], 12);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
      }).addTo(map);
      map.on("click", (e: any) => {
        const p = { lat: e.latlng.lat, lng: e.latlng.lng };
        const cur = stateRef.current;
        if (!cur.pickup) onChangeRef.current({ pickup: p, dropoff: cur.dropoff });
        else if (!cur.dropoff) onChangeRef.current({ pickup: cur.pickup, dropoff: p });
        else onChangeRef.current({ pickup: p, dropoff: null });
      });
      mapRef.current = map;
      setReady(true);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync markers
  useEffect(() => {
    const map = mapRef.current;
    const L = layersRef.current.L;
    if (!map || !L || !ready) return;
    const makeIcon = (label: string, bg: string) => L.divIcon({
      className: "",
      html: `<div style="background:${bg};color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;box-shadow:0 4px 12px rgba(0,0,0,.25);border:2px solid white">${label}</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
    if (layersRef.current.a) { map.removeLayer(layersRef.current.a); layersRef.current.a = null; }
    if (layersRef.current.b) { map.removeLayer(layersRef.current.b); layersRef.current.b = null; }
    if (layersRef.current.line) { map.removeLayer(layersRef.current.line); layersRef.current.line = null; }
    if (pickup) layersRef.current.a = L.marker([pickup.lat, pickup.lng], { icon: makeIcon("A", "hsl(160 84% 39%)") }).addTo(map);
    if (dropoff) layersRef.current.b = L.marker([dropoff.lat, dropoff.lng], { icon: makeIcon("B", "hsl(38 92% 50%)") }).addTo(map);
    if (pickup && dropoff) {
      layersRef.current.line = L.polyline(
        [[pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]],
        { color: "#1E3A8A", weight: 3, dashArray: "6 6" },
      ).addTo(map);
    }
  }, [pickup?.lat, pickup?.lng, dropoff?.lat, dropoff?.lng, ready]);

  return <div ref={containerRef} style={{ height }} className="overflow-hidden rounded-2xl border border-border bg-accent/30" />;
}
