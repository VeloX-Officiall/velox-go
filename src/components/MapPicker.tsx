import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default icon paths (Vite/SSR safe)
const iconA = L.divIcon({
  className: "",
  html: `<div style="background:hsl(160 84% 39%);color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;box-shadow:0 4px 12px rgba(0,0,0,.25);border:2px solid white">A</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});
const iconB = L.divIcon({
  className: "",
  html: `<div style="background:hsl(38 92% 50%);color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;box-shadow:0 4px 12px rgba(0,0,0,.25);border:2px solid white">B</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

export type LatLng = { lat: number; lng: number };

function ClickHandler({ onClick }: { onClick: (p: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export function MapPicker({
  pickup,
  dropoff,
  onChange,
  height = 280,
  center = { lat: 40.4093, lng: 49.8671 }, // neutral default
}: {
  pickup: LatLng | null;
  dropoff: LatLng | null;
  onChange: (next: { pickup: LatLng | null; dropoff: LatLng | null }) => void;
  height?: number;
  center?: LatLng;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div style={{ height }} className="rounded-2xl bg-accent/30" />;

  const handleClick = (p: LatLng) => {
    if (!pickup) onChange({ pickup: p, dropoff });
    else if (!dropoff) onChange({ pickup, dropoff: p });
    else onChange({ pickup: p, dropoff: null });
  };

  return (
    <div style={{ height }} className="overflow-hidden rounded-2xl border border-border">
      <MapContainer center={[center.lat, center.lng]} zoom={12} style={{ height: "100%", width: "100%" }}>
        <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <ClickHandler onClick={handleClick} />
        {pickup && <Marker position={[pickup.lat, pickup.lng]} icon={iconA} />}
        {dropoff && <Marker position={[dropoff.lat, dropoff.lng]} icon={iconB} />}
        {pickup && dropoff && (
          <Polyline positions={[[pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]]} pathOptions={{ color: "#1E3A8A", weight: 3, dashArray: "6 6" }} />
        )}
      </MapContainer>
    </div>
  );
}
