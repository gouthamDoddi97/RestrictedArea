import type { LatLngTuple } from 'leaflet';

const EARTH_RADIUS_M = 6_371_000;

export function haversineMeters(a: LatLngTuple, b: LatLngTuple): number {
  const [lat1, lon1] = a;
  const [lat2, lon2] = b;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const s =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(s)));
}

export function positionAlongRoute(
  start: LatLngTuple,
  end: LatLngTuple,
  progress: number,
): LatLngTuple {
  const t = Math.min(1, Math.max(0, progress));
  return [start[0] + (end[0] - start[0]) * t, start[1] + (end[1] - start[1]) * t];
}

/** Random speed in m/s (~30–90 km/h). */
export function randomSpeedMps(): number {
  return 8 + Math.random() * 17;
}
