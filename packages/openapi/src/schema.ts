import { createDocument } from "zod-openapi";
import { authPaths } from "./paths/auth";
import { categoryPaths } from "./paths/category";

export function generateOpenAPIDocument() {
  return createDocument({
    openapi: "3.0.3",
    info: {
      title: "Cartspace API",
      version: "1.0.0",
      description:
        "The Cartspace API provides secure, RESTful endpoints for storefront operations including user authentication, product discovery, shopping cart, and order management.",
    },
    servers: [{ url: "/", description: "Current host" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    paths: {
      ...authPaths,
      ...categoryPaths,
    },
  });
}
