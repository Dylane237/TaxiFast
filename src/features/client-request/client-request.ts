import { z } from "zod";

const formSchema = z
  .object({
    corridorId: z.string().min(1),
    fromStopId: z.string().min(1),
    toStopId: z.string().min(1),
    price: z.coerce.number().int().min(100).max(100_000),
    startMinutes: z.number().int().min(0),
    durationMinutes: z.number().int().min(30),
  })
  .refine((value) => value.fromStopId !== value.toStopId, {
    message: "Choisissez deux arrêts différents.",
  });

export type ClientRequestForm = z.input<typeof formSchema>;

export function parseClientRequestForm(
  input: ClientRequestForm,
  now = new Date(),
) {
  const parsed = formSchema.safeParse(input);
  if (!parsed.success)
    return {
      success: false as const,
      message: parsed.error.issues[0]?.message ?? "Vérifiez la demande.",
    };
  const windowStart = new Date(
    now.getTime() + parsed.data.startMinutes * 60_000,
  );
  const windowEnd = new Date(
    windowStart.getTime() + parsed.data.durationMinutes * 60_000,
  );
  return {
    success: true as const,
    data: {
      ...parsed.data,
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
    },
  };
}
