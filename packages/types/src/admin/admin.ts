import { z } from "zod";
import {
  Cents,
  paginatedResponse,
  successResponse,
  Timestamp,
  Uuid,
} from "../api/response";
import {
  OrderItemSchema,
  OrderSchema,
  OrderStatusSchema,
} from "../order/order";

export const ReviewStatusSchema = z
  .enum(["published", "hidden"])
  .meta({ id: "ReviewStatus" });
export type ReviewStatus = z.infer<typeof ReviewStatusSchema>;

export const StatsRangeSchema = z
  .enum(["7d", "30d", "90d"])
  .meta({ id: "StatsRange", description: "Days ending today (UTC)" });
export type StatsRange = z.infer<typeof StatsRangeSchema>;

const PeriodTotalsSchema = z
  .object({
    revenue: Cents.describe("Paid, shipped and delivered orders"),
    orders: z.int().nonnegative(),
    average_order_value: Cents,
    new_customers: z.int().nonnegative(),
  })
  .meta({
    id: "PeriodTotals",
    description: "Sales by payment date, and sign-ups",
  });

export const AdminStatsSchema = z
  .object({
    range: StatsRangeSchema,
    current: PeriodTotalsSchema.describe("The range"),
    previous: PeriodTotalsSchema.describe("The same number of days before it"),
    customers: z.int().nonnegative().describe("Customer accounts, all time"),
    series: z
      .array(
        z.object({
          day: z.iso.date(),
          revenue: Cents,
          orders: z.int().nonnegative(),
        }),
      )
      .describe("Every day of the range (UTC), oldest first"),
    orders_by_status: z
      .object({
        pending: z.int().nonnegative(),
        paid: z.int().nonnegative(),
        shipped: z.int().nonnegative(),
        delivered: z.int().nonnegative(),
        cancelled: z.int().nonnegative(),
        refunded: z.int().nonnegative(),
      })
      .describe("Every order by status, all time"),
    top_products: z
      .array(
        z.object({
          product_id: Uuid,
          product_name: z.string(),
          image: z.string().describe("Empty when the product has none"),
          units: z.int().positive(),
          revenue: Cents,
        }),
      )
      .describe("Best sellers by revenue in the range (5 at most)"),
    needs_attention: z.object({
      to_ship: z.int().nonnegative().describe("Paid orders"),
      oversold: z
        .int()
        .nonnegative()
        .describe("Paid orders with an item short of stock"),
      failed_emails: z.int().nonnegative().describe("Emails given up on"),
      out_of_stock: z
        .int()
        .nonnegative()
        .describe("Active variants with none left"),
    }),
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
    recent_reviews: z
      .array(
        z.object({
          id: Uuid,
          rating: z.int().min(1).max(5),
          title: z.string(),
          status: ReviewStatusSchema,
          created_at: Timestamp,
          product_id: Uuid,
          product_name: z.string(),
          author_name: z.string(),
        }),
      )
      .describe("The 5 latest, hidden ones too"),
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
    allowed_formats: z
      .string()
      .describe("Comma-separated; Cloudinary rejects any other format"),
    folder: z.string(),
    timestamp: z
      .int()
      .describe("Unix seconds; Cloudinary accepts it for an hour"),
    signature: z.string(),
  })
  .meta({
    id: "UploadSignature",
    description:
      "POST the file with these fields (all of them, unchanged) to https://api.cloudinary.com/v1_1/{cloud_name}/image/upload.",
  });
export type UploadSignature = z.infer<typeof UploadSignatureSchema>;

export const UploadSignatureResponseSchema = successResponse(
  UploadSignatureSchema,
).meta({ id: "UploadSignatureResponse" });

export const AdminOrderRowSchema = z
  .object({
    id: Uuid,
    number: z.int().positive(),
    status: OrderStatusSchema,
    total: Cents,
    currency: z.string(),
    email: z.string(),
    customer_name: z.string(),
    item_count: z.int().nonnegative(),
    created_at: Timestamp,
    paid_at: Timestamp.nullable(),
  })
  .meta({
    id: "AdminOrderRow",
    description: "A row of the admin orders table.",
  });
export type AdminOrderRow = z.infer<typeof AdminOrderRowSchema>;

export const AdminOrderListResponseSchema = paginatedResponse(
  AdminOrderRowSchema,
).meta({ id: "AdminOrderListResponse" });

export const PaymentSchema = z
  .object({
    id: Uuid,
    order_id: Uuid,
    stripe_session_id: z.string(),
    stripe_payment_intent_id: z.string().nullable(),
    amount: Cents,
    currency: z.string(),
    created_at: Timestamp,
    stripe_refund_id: z.string().nullable(),
    refunded_at: Timestamp.nullable(),
  })
  .meta({ id: "Payment", description: "The Stripe payment of an order." });
export type Payment = z.infer<typeof PaymentSchema>;

export const AdminOrderDetailSchema = OrderSchema.extend({
  items: z.array(OrderItemSchema),
  customer: z.object({ id: Uuid, name: z.string(), email: z.string() }),
  payment: PaymentSchema.nullable().describe("null until the order is paid"),
}).meta({ id: "AdminOrderDetail" });
export type AdminOrderDetail = z.infer<typeof AdminOrderDetailSchema>;

export const AdminOrderDetailResponseSchema = successResponse(
  AdminOrderDetailSchema,
).meta({ id: "AdminOrderDetailResponse" });

// Mirror apps/api/internal/types/admin.go.
export const ShipOrderBodySchema = z
  .object({
    tracking_number: z.string().trim().max(64).optional(),
  })
  .meta({ id: "ShipOrderBody" });
export type ShipOrderBody = z.infer<typeof ShipOrderBodySchema>;

export const RefundOrderBodySchema = z
  .object({
    restock: z
      .boolean()
      .describe(
        "Return the items to stock: yes for an order that never shipped, or came back",
      ),
  })
  .meta({ id: "RefundOrderBody" });
export type RefundOrderBody = z.infer<typeof RefundOrderBodySchema>;

export const ReviewStatusBodySchema = z
  .object({ status: ReviewStatusSchema })
  .meta({ id: "ReviewStatusBody" });

export const AdminReviewSchema = z
  .object({
    id: Uuid,
    rating: z.int().min(1).max(5),
    title: z.string(),
    body: z.string(),
    status: ReviewStatusSchema,
    created_at: Timestamp,
    updated_at: Timestamp,
    product_id: Uuid,
    product_name: z.string(),
    product_slug: z.string(),
    author_name: z.string(),
    author_email: z.string(),
  })
  .meta({
    id: "AdminReview",
    description: "A review with its product and author.",
  });
export type AdminReview = z.infer<typeof AdminReviewSchema>;

export const AdminReviewListResponseSchema = paginatedResponse(
  AdminReviewSchema,
).meta({ id: "AdminReviewListResponse" });

export const AdminReviewResponseSchema = successResponse(
  AdminReviewSchema,
).meta({ id: "AdminReviewResponse" });
