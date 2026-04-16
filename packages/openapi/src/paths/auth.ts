import {
  baseResponseSchema,
  loginSchema,
  signupSchema,
  validationErrorResponseSchema,
} from "@repo/types";
import type { ZodOpenApiPathsObject } from "zod-openapi";

export const authPaths: ZodOpenApiPathsObject = {
  "/api/auth/register": {
    post: {
      summary: "Register a new user",
      tags: ["Auth"],
      requestBody: {
        content: { "application/json": { schema: signupSchema } },
      },
      responses: {
        200: {
          description: "User registered successfully",
          content: { "application/json": { schema: baseResponseSchema } },
        },
        400: {
          description: "Validation error",
          content: {
            "application/json": { schema: validationErrorResponseSchema },
          },
        },

        409: {
          description: "User already exists",
          content: { "application/json": { schema: baseResponseSchema } },
        },
        500: {
          description: "Internal server error",
          content: { "application/json": { schema: baseResponseSchema } },
        },
      },
    },
  },
  "/api/auth/login": {
    post: {
      summary: "Login user",
      tags: ["Auth"],
      requestBody: {
        content: { "application/json": { schema: loginSchema } },
      },
      responses: {
        200: {
          description: "Login successful",
          content: {
            "application/json": { schema: baseResponseSchema },
          },
        },
        400: {
          description: "Invalid request body",
          content: {
            "application/json": { schema: validationErrorResponseSchema },
          },
        },
        401: {
          description: "Invalid credentials",
          content: { "application/json": { schema: baseResponseSchema } },
        },
        500: {
          description: "Internal server error",
          content: { "application/json": { schema: baseResponseSchema } },
        },
      },
    },
  },
  "/api/auth/logout": {
    post: {
      summary: "Logout user",
      description:
        "Reads refresh_token from httpOnly cookie. No request body needed.",
      tags: ["Auth"],
      responses: {
        200: {
          description: "Logged out successfully",
          content: { "application/json": { schema: baseResponseSchema } },
        },
        401: {
          description: "Invalid or missing refresh token cookie",
          content: { "application/json": { schema: baseResponseSchema } },
        },
        500: {
          description: "Internal server error",
          content: { "application/json": { schema: baseResponseSchema } },
        },
      },
    },
  },
  "/api/auth/refresh": {
    post: {
      summary: "Refresh access token",
      description:
        "Reads refresh_token from httpOnly cookie. No request body needed.",
      tags: ["Auth"],
      responses: {
        200: {
          description: "New access token issued",
          content: { "application/json": { schema: baseResponseSchema } },
        },
        401: {
          description: "Invalid or expired refresh token",
          content: { "application/json": { schema: baseResponseSchema } },
        },
        500: {
          description: "Internal server error",
          content: { "application/json": { schema: baseResponseSchema } },
        },
      },
    },
  },
};
