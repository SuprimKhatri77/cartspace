import z from "zod";

const errorSchema = z.object({
  code: z.string(),
  field: z.string(),
  message: z.string(),
});

export const baseResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  errors: z.array(errorSchema).optional(),
  data: z.unknown().optional(),
});

export const validationErrorResponseSchema = baseResponseSchema.extend({
  errors: z.array(errorSchema),
});
