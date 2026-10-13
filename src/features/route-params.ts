import { z } from "zod";

const routeIdSchema = z.string().trim().min(1).max(120);

export function parseRouteId(
  value: string | string[] | undefined,
): string | null {
  const parsed = routeIdSchema.safeParse(
    Array.isArray(value) ? value[0] : value,
  );
  return parsed.success ? parsed.data : null;
}
