export type Segment = { pickup: number; dropoff: number };

export function isValidSegment(segment: Segment): boolean {
  return (
    Number.isInteger(segment.pickup) &&
    Number.isInteger(segment.dropoff) &&
    segment.pickup < segment.dropoff
  );
}

export function canBook(capacity: number, existing: Segment[], candidate: Segment): boolean {
  if (!Number.isInteger(capacity) || capacity <= 0 || !isValidSegment(candidate)) return false;

  for (let leg = candidate.pickup; leg < candidate.dropoff; leg += 1) {
    const occupied = existing.filter(
      (booking) => booking.pickup <= leg && leg < booking.dropoff,
    ).length;
    if (occupied >= capacity) return false;
  }

  return true;
}
