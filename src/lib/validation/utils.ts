import type { z } from "zod";

export const nullableString = (schema: z.ZodString) =>
  schema
    .trim()
    .nullable()
    .transform((val) => (!val || val === "" ? null : val));
