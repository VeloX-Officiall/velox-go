// VeloX delivery fee calculator (AZN)
// Tier 1: distance ≤ 1.0 km → 1.50 AZN flat (minimum)
// Tier 2: 1.0 < d ≤ 10.0 → 1.50 + (ceil(d) - 1) * 0.50
// Tier 3: d > 10.0       → tier2(10) + (ceil(d) - 10) * 0.40
export function calcDeliveryFee(distanceKm: number): number {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return 1.5;
  if (distanceKm <= 1) return 1.5;
  const km = Math.ceil(distanceKm);
  if (km <= 10) return +(1.5 + (km - 1) * 0.5).toFixed(2);
  const tier2At10 = 1.5 + 9 * 0.5; // 6.00
  return +(tier2At10 + (km - 10) * 0.4).toFixed(2);
}

export function formatAzn(n: number): string {
  return `${n.toFixed(2)} AZN`;
}

// Haversine distance in km between two {lat, lng} points
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
