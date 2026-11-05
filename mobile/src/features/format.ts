export function formatPrice(value: number): string {
  return `${new Intl.NumberFormat("fr-FR").format(value)} FCFA`;
}

const JOUR_MS = 24 * 60 * 60_000;

function debutDeJournee(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** Heure à la française : « 15 h », « 7 h 05 ». */
export function formatHeure(value: string | Date): string {
  const date = new Date(value);
  const minutes = date.getMinutes();
  return minutes === 0 ? `${date.getHours()} h` : `${date.getHours()} h ${String(minutes).padStart(2, "0")}`;
}

/** « aujourd'hui », « demain », « hier », sinon « jeu. 5 nov. ». */
export function formatJour(value: string | Date, now: Date = new Date()): string {
  const date = new Date(value);
  const ecart = Math.round((debutDeJournee(date) - debutDeJournee(now)) / JOUR_MS);
  if (ecart === 0) return "aujourd’hui";
  if (ecart === 1) return "demain";
  if (ecart === -1) return "hier";
  return date.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}

/** « aujourd'hui à 15 h 30 », « jeu. 5 nov. à 7 h ». */
export function formatDateTime(value: string, now: Date = new Date()): string {
  return `${formatJour(value, now)} à ${formatHeure(value)}`;
}

/** Heure seule, au même format que formatDateTime. */
export function formatTime(value: string): string {
  return formatHeure(value);
}

/** « aujourd'hui, de 15 h à 16 h 30 », ou « de 23 h aujourd'hui à 1 h demain » si la plage change de jour. */
export function formatPlage(debut: string, fin: string, now: Date = new Date()): string {
  const jourDebut = formatJour(debut, now);
  if (jourDebut === formatJour(fin, now)) return `${jourDebut}, de ${formatHeure(debut)} à ${formatHeure(fin)}`;
  return `de ${formatHeure(debut)} ${jourDebut} à ${formatHeure(fin)} ${formatJour(fin, now)}`;
}

/** Met la première lettre en capitale, pour un texte qui commence une ligne. */
export function capitaliser(texte: string): string {
  return texte.charAt(0).toLocaleUpperCase("fr-FR") + texte.slice(1);
}

/** Note sur 5 avec une virgule : « 4,8 ». */
export function formatNote(note: number): string {
  return note.toFixed(1).replace(".", ",");
}

/** Numéro camerounais lisible : « +237 6 90 00 00 99 ». Les autres numéros restent tels quels. */
export function formatTelephone(numero: string): string {
  const match = /^\+237(\d)(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(numero.replace(/\s/g, ""));
  return match ? `+237 ${match.slice(1).join(" ")}` : numero;
}
