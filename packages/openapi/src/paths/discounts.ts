import { z } from "zod";
import { Uuid } from "@repo/types";
import { schemas } from "../schemas.ts";
import { body, operation } from "./shared.ts";

const tag = "Admin";
const idParam = z.object({ id: Uuid });

export function registerDiscountPaths() {
  operation({
    method: "get",
    path: "/api/v1/admin/discounts",
    operationId: "adminListDiscounts",
    tag,
    summary: "Discount codes",
    description:
      "Newest first, 20 per page, each with its uses (orders that weren't cancelled). q is a piece of the code.",
    auth: "admin",
    request: {
      query: z.object({
        page: z.int().min(1).max(100_000).optional(),
        state: schemas.DiscountStateSchema.optional(),
        q: z.string().max(32).optional(),
      }),
    },
    success: {
      status: 200,
      description: "Discount codes fetched",
      schema: schemas.DiscountCodeListResponseSchema,
    },
    errors: {
      400: "Invalid page or filter (INVALID_PAGE_PARAMETER, INVALID_QUERY_PARAMETER)",
    },
  });

  operation({
    method: "post",
    path: "/api/v1/admin/discounts",
    operationId: "adminCreateDiscount",
    tag,
    summary: "Create a discount code",
    description: "The code is stored upper-case.",
    auth: "admin",
    request: body(schemas.DiscountCodeBodySchema),
    success: {
      status: 201,
      description: "Discount code created",
      schema: schemas.DiscountCodeResponseSchema,
    },
    errors: {
      400: "Invalid body (VALIDATION_FAILED)",
      409: "The code is taken (DISCOUNT_CODE_TAKEN)",
    },
  });

  operation({
    method: "put",
    path: "/api/v1/admin/discounts/{id}",
    operationId: "adminUpdateDiscount",
    tag,
    summary: "Update a discount code",
    description:
      "Replaces its settings. Once an order has used it, the code itself can't change.",
    auth: "admin",
    request: { params: idParam, ...body(schemas.DiscountCodeBodySchema) },
    success: {
      status: 200,
      description: "Discount code saved",
      schema: schemas.DiscountCodeResponseSchema,
    },
    errors: {
      400: "Invalid id or body (INVALID_DISCOUNT_ID, VALIDATION_FAILED)",
      404: "No such code (DISCOUNT_NOT_FOUND)",
      409: "The code is taken, or a used code was renamed (DISCOUNT_CODE_TAKEN, DISCOUNT_IN_USE)",
    },
  });

  operation({
    method: "delete",
    path: "/api/v1/admin/discounts/{id}",
    operationId: "adminDeleteDiscount",
    tag,
    summary: "Delete a discount code",
    description: "Only a code no order has used; switch a used one off.",
    auth: "admin",
    request: { params: idParam },
    success: {
      status: 200,
      description: "Discount code deleted",
      schema: schemas.MessageResponseSchema,
    },
    errors: {
      400: "Invalid id (INVALID_DISCOUNT_ID)",
      404: "No such code (DISCOUNT_NOT_FOUND)",
      409: "Orders have used it (DISCOUNT_IN_USE)",
    },
  });
}
