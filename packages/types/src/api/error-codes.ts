import { z } from "zod";

/**
 * Codes in the `code` field of failed responses. Must list exactly the Go
 * constants in apps/api/internal/constants/error_codes.go; the API's
 * contract test fails otherwise.
 */
export const ErrorCodeSchema = z
  .enum([
    // general
    "INTERNAL_SERVER_ERROR",
    "VALIDATION_FAILED",
    "INVALID_PAGE_PARAMETER",
    "INVALID_PRICE_FILTER",
    "INVALID_QUERY_PARAMETER",
    "ROUTE_NOT_FOUND",
    "METHOD_NOT_ALLOWED",
    // auth
    "INVALID_CREDENTIALS",
    "MISSING_REFRESH_TOKEN",
    "INVALID_REFRESH_TOKEN",
    "USER_ALREADY_EXISTS",
    "FORBIDDEN",
    "INVALID_TOKEN_CLAIMS",
    "USER_NOT_FOUND",
    "MISSING_ACCESS_TOKEN",
    "INVALID_ACCESS_TOKEN",
    // product
    "PRODUCT_NOT_FOUND",
    "INVALID_PRODUCT_ID",
    // variant
    "VARIANT_NOT_FOUND",
    "INVALID_VARIANT_ID",
    "VARIANT_ALREADY_EXISTS",
    "DEFAULT_VARIANT_EXISTS",
    // category
    "CATEGORY_NOT_FOUND",
    "INVALID_CATEGORY_ID",
    "CATEGORY_ALREADY_EXISTS",
    "SELF_REFERENCING_CATEGORY",
    "CYCLIC_CATEGORY_REFERENCE",
    // cart
    "VARIANT_UNAVAILABLE",
    "INSUFFICIENT_STOCK",
    "CART_QUANTITY_LIMIT",
    "CART_FULL",
    "CART_ITEM_NOT_FOUND",
  ])
  .meta({ id: "ErrorCode", description: "Machine-readable failure code." });

export type ErrorCode = z.infer<typeof ErrorCodeSchema>;
