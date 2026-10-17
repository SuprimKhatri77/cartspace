import { z } from "zod";
import {
  Cents,
  paginatedResponse,
  successResponse,
  Timestamp,
  Uuid,
} from "../api/response";

export const DiscountKindSchema = z.enum(["percent", "fixed"]).meta({
  id: "DiscountKind",
  description: "percent: value is % off the items; fixed: value is cents off",
});
export type DiscountKind = z.infer<typeof DiscountKindSchema>;

export const DiscountStateSchema = z
  .enum(["active", "scheduled", "ended", "off"])
  .meta({
    id: "DiscountState",
    description:
      "active: open to shoppers; scheduled: not started; ended: past its end or used up; off: switched off",
  });
export type DiscountState = z.infer<typeof DiscountStateSchema>;

/** 3 to 32 letters, digits, hyphens and underscores (any case). */
export const DISCOUNT_CODE_PATTERN = /^[a-z0-9][a-z0-9_-]{2,31}$/i;

export const DiscountCodeSchema = z
  .object({
    id: Uuid,
    code: z.string().describe("Upper-case"),
    kind: DiscountKindSchema,
    value: z.int().positive(),
    min_subtotal: Cents.describe("The items' subtotal an order needs"),
    starts_at: Timestamp.nullable(),
    ends_at: Timestamp.nullable(),
    max_redemptions: z.int().positive().nullable().describe("null: no limit"),
    once_per_customer: z.boolean(),
    is_active: z.boolean(),
    created_at: Timestamp,
    updated_at: Timestamp,
    uses: z
      .int()
      .nonnegative()
      .describe("Orders that used the code and weren't cancelled"),
    state: DiscountStateSchema,
  })
  .meta({ id: "DiscountCode", description: "A discount code with its uses." });
export type DiscountCode = z.infer<typeof DiscountCodeSchema>;

export const DiscountCodeBodySchema = z
  .object({
    code: z.string().regex(DISCOUNT_CODE_PATTERN),
    kind: DiscountKindSchema,
    value: z.int().positive().max(100_000_000).describe("1-100 for percent"),
    min_subtotal: Cents.max(100_000_000),
    starts_at: Timestamp.nullable().optional(),
    ends_at: Timestamp.nullable().optional(),
    max_redemptions: z.int().positive().max(1_000_000).nullable().optional(),
    once_per_customer: z.boolean().optional(),
    is_active: z.boolean(),
  })
  .meta({
    id: "DiscountCodeBody",
    description:
      "Creates or replaces a code. A used code keeps its code; the rest can change.",
  });
export type DiscountCodeBody = z.infer<typeof DiscountCodeBodySchema>;

export const DiscountCodeListResponseSchema = paginatedResponse(
  DiscountCodeSchema,
).meta({ id: "DiscountCodeListResponse" });

export const DiscountCodeResponseSchema = successResponse(
  DiscountCodeSchema,
).meta({ id: "DiscountCodeResponse" });
