import z from "zod";

export const baseResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

const errorsSchema = z
  .array(
    z.object({
      code: z.string(),
      field: z.string(),
      message: z.string(),
    }),
  )
  .optional();

export const validationErrorResponseSchema = baseResponseSchema.extend({
  errors: errorsSchema,
});
