import { z } from "zod";
import { schemas } from "../schemas.ts";
import { body, operation } from "./shared.ts";

export function registerAdminPaths() {
  operation({
    method: "get",
    path: "/api/v1/admin/stats",
    operationId: "adminGetStats",
    tag: "Admin",
    summary: "Dashboard figures",
    description:
      "Sales (paid, shipped and delivered orders), the last 30 days by day, low stock and recent orders.",
    auth: "admin",
    success: {
      status: 200,
      description: "Stats fetched",
      schema: schemas.AdminStatsResponseSchema,
    },
  });

  operation({
    method: "post",
    path: "/api/v1/admin/uploads/signature",
    operationId: "adminSignUpload",
    tag: "Admin",
    summary: "Sign an image upload",
    description:
      "A signature for one direct browser upload to Cloudinary (folder cartspace/products), valid for an hour.",
    auth: "admin",
    success: {
      status: 200,
      description: "Upload signed",
      schema: schemas.UploadSignatureResponseSchema,
    },
  });

  const page = z.int().min(1).max(100_000).optional();
  const number = z.object({ number: z.int().positive() });
  const orderErrors = {
    400: "Invalid order number (INVALID_ORDER_NUMBER)",
    404: "No order with that number (ORDER_NOT_FOUND)",
  };

  operation({
    method: "get",
    path: "/api/v1/admin/orders",
    operationId: "adminListOrders",
    tag: "Admin",
    summary: "All orders",
    description:
      "Newest first, 20 per page. q is an order number (1042, CS-1042 or #1042) or a piece of the customer's email.",
    auth: "admin",
    request: {
      query: z.object({
        page,
        status: schemas.OrderStatusSchema.optional(),
        q: z.string().max(100).optional(),
      }),
    },
    success: {
      status: 200,
      description: "Orders fetched",
      schema: schemas.AdminOrderListResponseSchema,
    },
    errors: {
      400: "Invalid page or filter (INVALID_PAGE_PARAMETER, INVALID_QUERY_PARAMETER)",
    },
  });

  operation({
    method: "get",
    path: "/api/v1/admin/orders/{number}",
    operationId: "adminGetOrder",
    tag: "Admin",
    summary: "One order",
    description: "With its items, customer and payment.",
    auth: "admin",
    request: { params: number },
    success: {
      status: 200,
      description: "Order fetched",
      schema: schemas.AdminOrderDetailResponseSchema,
    },
    errors: orderErrors,
  });

  const transition =
    "Not allowed in the order's status (INVALID_ORDER_TRANSITION)";

  operation({
    method: "post",
    path: "/api/v1/admin/orders/{number}/ship",
    operationId: "adminShipOrder",
    tag: "Admin",
    summary: "Mark an order shipped",
    description:
      "A paid order becomes shipped, with its tracking number if given.",
    auth: "admin",
    request: { params: number, ...body(schemas.ShipOrderBodySchema) },
    success: {
      status: 200,
      description: "Order shipped",
      schema: schemas.AdminOrderDetailResponseSchema,
    },
    errors: {
      400: "Invalid order number or body (INVALID_ORDER_NUMBER, VALIDATION_FAILED)",
      404: orderErrors[404],
      409: transition,
    },
  });

  operation({
    method: "post",
    path: "/api/v1/admin/orders/{number}/deliver",
    operationId: "adminDeliverOrder",
    tag: "Admin",
    summary: "Mark an order delivered",
    description: "A shipped order becomes delivered.",
    auth: "admin",
    request: { params: number },
    success: {
      status: 200,
      description: "Order delivered",
      schema: schemas.AdminOrderDetailResponseSchema,
    },
    errors: { ...orderErrors, 409: transition },
  });

  operation({
    method: "post",
    path: "/api/v1/admin/orders/{number}/cancel",
    operationId: "adminCancelOrder",
    tag: "Admin",
    summary: "Cancel an unpaid order",
    description:
      "A pending order is cancelled and its stock returned. Its Stripe page is expired first; if it was paid meanwhile, the order is settled as paid and the answer is 409 ORDER_ALREADY_PAID.",
    auth: "admin",
    request: { params: number },
    success: {
      status: 200,
      description: "Order cancelled",
      schema: schemas.AdminOrderDetailResponseSchema,
    },
    errors: {
      ...orderErrors,
      409: "Not pending, still opening its checkout or settling a payment, or just paid (INVALID_ORDER_TRANSITION, ORDER_ALREADY_PAID)",
      502: "Stripe didn't answer; nothing changed (PAYMENT_PROVIDER_ERROR)",
    },
  });

  operation({
    method: "post",
    path: "/api/v1/admin/orders/{number}/refund",
    operationId: "adminRefundOrder",
    tag: "Admin",
    summary: "Refund an order",
    description:
      "A paid, shipped or delivered order is refunded in full through Stripe (once: the refund is keyed by the order) and becomes refunded.",
    auth: "admin",
    request: { params: number, ...body(schemas.RefundOrderBodySchema) },
    success: {
      status: 200,
      description: "Order refunded",
      schema: schemas.AdminOrderDetailResponseSchema,
    },
    errors: {
      400: "Invalid order number or body (INVALID_ORDER_NUMBER, VALIDATION_FAILED)",
      404: orderErrors[404],
      409: "Not refundable in its status, no payment recorded, or Stripe declined it (INVALID_ORDER_TRANSITION, REFUND_REFUSED)",
      502: "Stripe didn't answer; nothing changed (PAYMENT_PROVIDER_ERROR)",
      503: "Payments aren't set up (PAYMENTS_UNAVAILABLE)",
    },
  });

  operation({
    method: "get",
    path: "/api/v1/admin/reviews",
    operationId: "adminListReviews",
    tag: "Admin",
    summary: "All reviews",
    description: "Newest first, 20 per page, for moderation.",
    auth: "admin",
    request: {
      query: z.object({
        page,
        status: schemas.ReviewStatusSchema.optional(),
        rating: z.int().min(1).max(5).optional(),
      }),
    },
    success: {
      status: 200,
      description: "Reviews fetched",
      schema: schemas.AdminReviewListResponseSchema,
    },
    errors: {
      400: "Invalid page or filter (INVALID_PAGE_PARAMETER, INVALID_QUERY_PARAMETER)",
    },
  });

  operation({
    method: "put",
    path: "/api/v1/admin/reviews/{id}/status",
    operationId: "adminSetReviewStatus",
    tag: "Admin",
    summary: "Publish or hide a review",
    description: "The product's rating counts published reviews only.",
    auth: "admin",
    request: {
      params: z.object({ id: z.uuid() }),
      ...body(schemas.ReviewStatusBodySchema),
    },
    success: {
      status: 200,
      description: "Review updated",
      schema: schemas.AdminReviewResponseSchema,
    },
    errors: {
      400: "Invalid id or body (INVALID_REVIEW_ID, VALIDATION_FAILED)",
      404: "No such review (REVIEW_NOT_FOUND)",
    },
  });

  operation({
    method: "put",
    path: "/api/v1/admin/settings",
    operationId: "adminSetStoreTheme",
    tag: "Admin",
    summary: "Change the store's theme",
    description: "The storefront switches to the theme on its next render.",
    auth: "admin",
    request: body(schemas.StoreThemeBodySchema),
    success: {
      status: 200,
      description: "Store theme updated",
      schema: schemas.StoreSettingsResponseSchema,
    },
    errors: { 400: "Unknown theme (VALIDATION_FAILED)" },
  });
}
