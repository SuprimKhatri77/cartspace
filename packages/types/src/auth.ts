import z from "zod";
import { baseResponseSchema } from "./base";

export const signupSchema = z.object({
  name: z.string().min(2).max(50).trim(),
  email: z.email().trim(),
  password: z.string().min(8).max(50),
});

export const loginSchema = z.object({
  email: z.email().trim(),
  password: z.string().min(8).max(50),
});

export const signupResponseSchema = baseResponseSchema;
export const loginResponseSchema = baseResponseSchema;

export type Signup = z.infer<typeof signupSchema>;
export type Login = z.infer<typeof loginSchema>;

export type SignupResponse = z.infer<typeof signupResponseSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
