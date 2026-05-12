import { useEffect, useRef, useState } from "react";

export type LatLng = { lat: number; lng: number };

export function MapPicker({
  pickup,
  dropoff,
  onChange,
  height = 280,
  center = { lat: 40.4093, lng: 49.8671 },
  onRouteDistance,
}: {
  pickup: LatLng | null;
  dropoff: LatLng | null;
  onChange: (next: { pickup: LatLng | null; dropoff: LatLng | null }) => void;
  height?: number;
  center?: LatLng;
  onRouteDistance?: (km: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layersRef = useRef<{ a: any; b: any; line: any; glow: any; L: any }>({ a: null, b: null, line: null, glow: null, L: null });
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
      const map = L.map(containerRef.current, { zoomControl: true }).setView([center.lat, center.lng], 12);
      // Dark luxe map tiles (Carto dark_all)
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: "&copy; OpenStreetMap &copy; CARTO",
        subdomains: "abcd",
        maxZoom: 19,
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

  // Sync markers + Wolt-style routed line via OSRM
  useEffect(() => {
    const map = mapRef.current;
    const L = layersRef.current.L;
    if (!map || !L || !ready) return;
    const makeIcon = (label: string, bg: string) => L.divIcon({
      className: "",
      html: `<div style="background:${bg};color:white;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;box-shadow:0 0 18px ${bg},0 6px 16px rgba(0,0,0,.5);border:2px solid rgba(255,255,255,.9)">${label}</div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });
    const clear = (k: "a" | "b" | "line" | "glow") => {
      if (layersRef.current[k]) { map.removeLayer(layersRef.current[k]); layersRef.current[k] = null; }
    };
    clear("a"); clear("b"); clear("line"); clear("glow");
    if (pickup) layersRef.current.a = L.marker([pickup.lat, pickup.lng], { icon: makeIcon("A", "#22d3ee") }).addTo(map);
    if (dropoff) layersRef.current.b = L.marker([dropoff.lat, dropoff.lng], { icon: makeIcon("B", "#3b82f6") }).addTo(map);

    if (pickup && dropoff) {
      let cancelled = false;
      const url = `https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}?overview=full&geometries=geojson`;
      fetch(url)
        .then((r) => r.json())
        .then((j) => {
          if (cancelled) return;
          const route = j?.routes?.[0];
          let coords: [number, number][] = route?.geometry?.coordinates?.map((c: [number, number]) => [c[1], c[0]]) ?? [
            [pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng],
          ];
          // outer glow
          layersRef.current.glow = L.polyline(coords, { color: "#60a5fa", weight: 10, opacity: 0.25, lineCap: "round" }).addTo(map);
          layersRef.current.line = L.polyline(coords, { color: "#3b82f6", weight: 5, opacity: 0.95, lineCap: "round" }).addTo(map);
          map.fitBounds(layersRef.current.line.getBounds(), { padding: [40, 40] });
          if (typeof route?.distance === "number") onRouteDistance?.(route.distance / 1000);
        })
        .catch(() => {
          const coords: [number, number][] = [[pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]];
          layersRef.current.glow = L.polyline(coords, { color: "#60a5fa", weight: 10, opacity: 0.25 }).addTo(map);
          layersRef.current.line = L.polyline(coords, { color: "#3b82f6", weight: 5, opacity: 0.95, dashArray: "8 8" }).addTo(map);
        });
      return () => { cancelled = true; };
    }
  }, [pickup?.lat, pickup?.lng, dropoff?.lat, dropoff?.lng, ready]);

  return <div ref={containerRef} style={{ height }} className="overflow-hidden rounded-2xl border border-border bg-card shadow-glow" />;
}
