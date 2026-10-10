import type { RouteConfig } from "@asteasolutions/zod-to-openapi";
import type { ZodType } from "zod";
import { registry } from "../registry.ts";
import { ACCESS_COOKIE, REFRESH_COOKIE, schemas } from "../schemas.ts";

/** "refresh-optional": the refresh cookie is used when present. */
type Auth = "public" | "user" | "admin" | "refresh" | "refresh-optional";

type Operation = {
  method: RouteConfig["method"];
  /** OpenAPI path, e.g. /api/v1/products/{productSlug} */
  path: string;
  /** Becomes the generated client function name. */
  operationId: string;
  tag: string;
  summary: string;
  description?: string;
  auth?: Auth;
  request?: RouteConfig["request"];
  success: { status: 200 | 201; description: string; schema: ZodType };
  /** Endpoint-specific errors; auth and 500 errors are added from `auth`. */
  errors?: Partial<Record<400 | 401 | 403 | 404 | 409, string>>;
};

const json = (schema: ZodType, description: string) => ({
  description,
  content: { "application/json": { schema } },
});

const security: Record<Auth, RouteConfig["security"]> = {
  public: undefined,
  user: [{ [ACCESS_COOKIE]: [] }],
  admin: [{ [ACCESS_COOKIE]: [] }],
  refresh: [{ [REFRESH_COOKIE]: [] }],
  "refresh-optional": [{ [REFRESH_COOKIE]: [] }, {}],
};

/** Registers one endpoint with the shared error envelope on every error. */
export function operation(op: Operation) {
  const auth = op.auth ?? "public";
  const errors: Record<number, string> = {};
  for (const [status, description] of Object.entries(op.errors ?? {})) {
    if (description) errors[Number(status)] = description;
  }
  if (auth === "user" || auth === "admin") {
    errors[401] ??=
      "Missing or invalid access token (MISSING_ACCESS_TOKEN, INVALID_ACCESS_TOKEN, INVALID_TOKEN_CLAIMS)";
  }
  if (auth === "admin") {
    errors[403] ??= "Not an admin (FORBIDDEN)";
  }
  errors[500] = "Unexpected server error (INTERNAL_SERVER_ERROR)";

  const responses: RouteConfig["responses"] = {
    [op.success.status]: json(op.success.schema, op.success.description),
  };
  for (const [status, description] of Object.entries(errors)) {
    responses[status] = json(schemas.ApiErrorSchema, description);
  }

  registry.registerPath({
    method: op.method,
    path: op.path,
    operationId: op.operationId,
    tags: [op.tag],
    summary: op.summary,
    description: op.description,
    security: security[auth],
    request: op.request,
    responses,
  });
}

/** A JSON request body. */
export const body = (schema: ZodType) => ({
  body: { required: true, content: { "application/json": { schema } } },
});
