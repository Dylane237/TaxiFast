// Segment d'une réservation, exprimé en positions (TripStop.sequence).
// pickup < dropoff : le passager occupe une place sur les tronçons pickup, pickup+1, ..., dropoff-1.
export type Segment = { pickup: number; dropoff: number };

export function isValidSegment(s: Segment): boolean {
  return Number.isInteger(s.pickup) && Number.isInteger(s.dropoff) && s.pickup < s.dropoff;
}

// Vrai si la réservation candidate tient dans la capacité sur chaque tronçon qu'elle couvre.
// `existing` = réservations déjà CONFIRMED du trajet.
export function canBook(capacity: number, existing: Segment[], candidate: Segment): boolean {
  if (!isValidSegment(candidate)) return false;
  for (let leg = candidate.pickup; leg < candidate.dropoff; leg++) {
    const occupied = existing.filter((b) => b.pickup <= leg && leg < b.dropoff).length;
    if (occupied >= capacity) return false;
  }
  return true;
}
