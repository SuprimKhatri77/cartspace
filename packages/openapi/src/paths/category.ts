import {
  baseResponseSchema,
  createCategorySchema,
  updateCategorySchema,
  validationErrorResponseSchema,
} from "@repo/types";
import type { ZodOpenApiPathsObject } from "zod-openapi";

export const categoryPaths: ZodOpenApiPathsObject = {
  "/api/admin/category": {
    post: {
      summary: "Create a new category",
      tags: ["Category"],
      security: [{ bearerAuth: [] }],
      requestBody: {
        content: { "application/json": { schema: createCategorySchema } },
      },
      responses: {
        200: {
          description: "Category created successfully",
          content: { "application/json": { schema: baseResponseSchema } },
        },
        400: {
          description: "Validation error",
          content: {
            "application/json": { schema: validationErrorResponseSchema },
          },
        },
        404: {
          description: "Parent category not found",
          content: { "application/json": { schema: baseResponseSchema } },
        },
        500: {
          description: "Internal server error",
          content: { "application/json": { schema: baseResponseSchema } },
        },
      },
    },
    get: {
      summary: "Get paginated categories",
      tags: ["Category"],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "page",
          in: "query",
          required: false,
          schema: { type: "integer", default: 1 },
          description: "Page number (defaults to 1)",
        },
      ],
      responses: {
        200: {
          description: "Categories fetched successfully",
          content: { "application/json": { schema: baseResponseSchema } },
        },
        400: {
          description: "Invalid page parameter",
          content: { "application/json": { schema: baseResponseSchema } },
        },
        500: {
          description: "Internal server error",
          content: { "application/json": { schema: baseResponseSchema } },
        },
      },
    },
  },
  "/api/admin/category/{id}": {
    put: {
      summary: "Update a category",
      tags: ["Category"],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
          description: "Category ID",
        },
      ],
      requestBody: {
        content: { "application/json": { schema: updateCategorySchema } },
      },
      responses: {
        200: {
          description: "Category updated successfully",
          content: { "application/json": { schema: baseResponseSchema } },
        },
        400: {
          description: "Validation error or invalid UUID",
          content: {
            "application/json": { schema: validationErrorResponseSchema },
          },
        },
        404: {
          description: "Category not found",
          content: { "application/json": { schema: baseResponseSchema } },
        },
        409: {
          description: "Circular reference detected",
          content: { "application/json": { schema: baseResponseSchema } },
        },
        500: {
          description: "Internal server error",
          content: { "application/json": { schema: baseResponseSchema } },
        },
      },
    },
    delete: {
      summary: "Delete a category",
      tags: ["Category"],
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
          description: "Category ID",
        },
      ],
      responses: {
        200: {
          description: "Category deleted successfully",
          content: { "application/json": { schema: baseResponseSchema } },
        },
        400: {
          description: "Invalid UUID format",
          content: { "application/json": { schema: baseResponseSchema } },
        },
        404: {
          description: "Category not found",
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
