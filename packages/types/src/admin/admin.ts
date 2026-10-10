import { z } from "zod";
import { Cents, successResponse, Timestamp, Uuid } from "../api/response";
import { OrderStatusSchema } from "../order/order";

export const AdminStatsSchema = z
  .object({
    revenue: z
      .int()
      .nonnegative()
      .describe("Cents, over paid, shipped and delivered orders"),
    orders: z.int().nonnegative(),
    average_order_value: Cents,
    customers: z.int().nonnegative(),
    sales_by_day: z
      .array(
        z.object({
          day: z.iso.date(),
          revenue: z.int().nonnegative(),
          orders: z.int().nonnegative(),
        }),
      )
      .describe("The last 30 days (UTC), oldest first, every day present"),
    low_stock: z
      .array(
        z.object({
          product_id: Uuid,
          product_name: z.string(),
          variant_id: Uuid,
          sku: z.string().nullable(),
          stock: z.int().nonnegative(),
        }),
      )
      .describe(
        "Active variants with 5 or fewer left, lowest first (10 at most)",
      ),
    recent_orders: z.array(
      z.object({
        id: Uuid,
        number: z.int().positive(),
        status: OrderStatusSchema,
        total: Cents,
        currency: z.string(),
        email: z.string(),
        created_at: Timestamp,
        paid_at: Timestamp.nullable(),
      }),
    ),
  })
  .meta({ id: "AdminStats" });
export type AdminStats = z.infer<typeof AdminStatsSchema>;

export const AdminStatsResponseSchema = successResponse(AdminStatsSchema).meta({
  id: "AdminStatsResponse",
});

export const UploadSignatureSchema = z
  .object({
    cloud_name: z.string(),
    api_key: z.string(),
    folder: z.string(),
    timestamp: z
      .int()
      .describe("Unix seconds; Cloudinary accepts it for an hour"),
    signature: z.string(),
  })
  .meta({
    id: "UploadSignature",
    description:
      "POST the file with these fields to https://api.cloudinary.com/v1_1/{cloud_name}/image/upload.",
  });
export type UploadSignature = z.infer<typeof UploadSignatureSchema>;

export const UploadSignatureResponseSchema = successResponse(
  UploadSignatureSchema,
).meta({ id: "UploadSignatureResponse" });
