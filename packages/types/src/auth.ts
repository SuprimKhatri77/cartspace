import z from "zod";

export const signupSchema = z.object({
  name: z.string().min(2).max(50).trim(),
  email: z.email().trim(),
  password: z.string().min(8).max(50),
});

export const loginSchema = z.object({
  email: z.email().trim(),
  password: z.string().min(8).max(50),
});
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

export const signupResponseSchema = baseResponseSchema;
export const loginResponseSchema = baseResponseSchema;

export type Signup = z.infer<typeof signupSchema>;
export type Login = z.infer<typeof loginSchema>;

export type SignupResponse = z.infer<typeof signupResponseSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
