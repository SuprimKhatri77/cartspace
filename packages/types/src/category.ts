import z from "zod";
import { validationErrorResponseSchema } from "./base";

export const createCategorySchema = z.object({
  name: z.string().min(2).max(20),
  parentID: z.uuid().optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(2).max(20),
  parentID: z.uuid().optional(),
});

export const createCategoryResponseSchema = validationErrorResponseSchema;
export const updateCategoryResponseSchema = validationErrorResponseSchema;

export type CreateCategory = z.infer<typeof createCategorySchema>;
export type UpdateCategory = z.infer<typeof updateCategorySchema>;

export type CreateCategoryResponse = z.infer<
  typeof createCategoryResponseSchema
>;
export type UpdateCategoryResponse = z.infer<
  typeof updateCategoryResponseSchema
>;
