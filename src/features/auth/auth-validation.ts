export function normaliserTelephone(value: string): string | null {
  const compact = value.replace(/[\s()-]/g, "");
  const local = compact.startsWith("+237") ? compact.slice(4) : compact;

  if (!/^6\d{8}$/.test(local)) return null;
  return `+237${local}`;
}

export function codeOtpValide(value: string): boolean {
  return /^\d{4}$/.test(value);
}

export function placesValides(value: string): boolean {
  const places = Number(value);
  return Number.isInteger(places) && places >= 1 && places <= 8;
}
