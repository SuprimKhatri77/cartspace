import { z } from "zod";
import { successResponse } from "../api/response";
import { PublicUserSchema } from "../user/user";

// Mirrors apps/api/internal/types/auth.go. Emails are trimmed and lowercased
// by the API; passwords are never trimmed (bcrypt reads at most 72 bytes).

export const RegisterBodySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2)
      .max(50)
      .regex(/^[a-zA-Z\s]+$/, "Name can only contain letters and spaces"),
    email: z.email().max(254),
    password: z.string().min(8).max(72),
  })
  .meta({ id: "RegisterBody" });
export type RegisterBody = z.infer<typeof RegisterBodySchema>;

export const LoginBodySchema = z
  .object({
    email: z.email().max(254),
    password: z.string().min(1).max(72),
  })
  .meta({ id: "LoginBody" });
export type LoginBody = z.infer<typeof LoginBodySchema>;

export const UserResponseSchema = successResponse(PublicUserSchema).meta({
  id: "UserResponse",
  description: "Returned by register, login and /auth/me.",
});
export type UserResponse = z.infer<typeof UserResponseSchema>;
