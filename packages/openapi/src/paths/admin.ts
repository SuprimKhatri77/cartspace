import { schemas } from "../schemas.ts";
import { operation } from "./shared.ts";

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
}
