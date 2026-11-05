export type RoutePoint = { latitude: number; longitude: number };

const EARTH_RADIUS_KM = 6_371;
const ESTIMATED_URBAN_SPEED_KMH = 22;

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function distanceBetweenKm(from: RoutePoint, to: RoutePoint): number {
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(haversine));
}

export function routeDistanceKm(points: RoutePoint[]): number {
  return points.slice(1).reduce(
    (total, point, index) => total + distanceBetweenKm(points[index]!, point),
    0,
  );
}

export function estimatedDurationMinutes(distanceKm: number): number {
  if (distanceKm <= 0) return 0;
  return Math.max(1, Math.ceil((distanceKm / ESTIMATED_URBAN_SPEED_KMH) * 60));
}
