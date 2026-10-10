import { z } from "zod";
import {
  paginatedResponse,
  successResponse,
  Timestamp,
  Uuid,
} from "../api/response";

export const CategorySchema = z
  .object({
    id: Uuid,
    name: z.string(),
    slug: z.string(),
    parent_id: Uuid.nullable().describe("null for a root category"),
    created_at: Timestamp,
    updated_at: Timestamp,
  })
  .meta({ id: "Category" });
export type Category = z.infer<typeof CategorySchema>;

// Mirrors apps/api/internal/types/category.go. Category names are unique.
export const CategoryBodySchema = z
  .object({
    name: z.string().trim().min(2).max(20),
    parent_id: Uuid.optional().describe(
      "Create: makes it a subcategory. Update: moves it; omit to keep the parent.",
    ),
  })
  .meta({
    id: "CategoryBody",
    description: "Create or update a category. Names are unique.",
  });
export type CategoryBody = z.infer<typeof CategoryBodySchema>;

export const CategoryResponseSchema = successResponse(CategorySchema).meta({
  id: "CategoryResponse",
});
export type CategoryResponse = z.infer<typeof CategoryResponseSchema>;

export const CategoryListResponseSchema = paginatedResponse(
  CategorySchema,
).meta({ id: "CategoryListResponse" });
export type CategoryListResponse = z.infer<typeof CategoryListResponseSchema>;
