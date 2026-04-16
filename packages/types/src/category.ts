import z from "zod";
import { baseResponseSchema } from "./base";

export const createCategorySchema = z.object({
  name: z.string().min(2).max(20),
  parentID: z.uuid().optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(2).max(20),
  parentID: z.uuid().optional(),
});

export const categorySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  slug: z.string(),
  parentID: z.uuid().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const createCategorySuccessResponseSchema = baseResponseSchema.extend({
  data: categorySchema,
});

export const updateCategorySuccessResponseSchema = baseResponseSchema.extend({
  data: categorySchema,
});

export const paginatedCategoriesSuccessResponseSchema =
  baseResponseSchema.extend({
    data: z.array(categorySchema),
  });

export type CreateCategory = z.infer<typeof createCategorySchema>;
export type UpdateCategory = z.infer<typeof updateCategorySchema>;

export type CreateCategorySuccessResponse = z.infer<
  typeof createCategorySuccessResponseSchema
>;
export type UpdateCategorySuccessResponse = z.infer<
  typeof updateCategorySuccessResponseSchema
>;

export type PaginatedCategoriesSuccessResponse = z.infer<
  typeof paginatedCategoriesSuccessResponseSchema
>;
