import type { z } from "zod";

/** Messages keyed by form field name ("email", "features[1]"). */
export type FieldErrors = Record<string, string>;

/**
 * A zod or API error path as a form field name: TanStack Form writes array
 * entries in brackets, so "features.1" and ["features", 1] are
 * "features[1]", and "properties.0.name" is "properties[0].name".
 */
export function fieldName(path: string | ReadonlyArray<PropertyKey>): string {
  const parts =
    typeof path === "string" ? path.split(".") : path.map((p) => String(p));
  return parts.reduce((name, part) => {
    if (/^\d+$/.test(part)) return `${name}[${part}]`;
    return name ? `${name}.${part}` : part;
  }, "");
}

export type SchemaErrorOptions = {
  /**
   * Names each field for plain-words messages ("Enter a city" instead of
   * zod's "Too small: expected string to have >=1 characters"); fields
   * without one are "a value". Without labels, the schema's own messages
   * show, for schemas that already word them.
   */
  labels?: Record<string, string>;
  /** Maps a body path to the form's field, when the two differ. */
  rename?: (name: string) => string;
};

/**
 * What a form-level validator returns for body: each field's first
 * message, or undefined when body parses. Issues on the body as a whole
 * become the form's error.
 */
export function schemaErrors(
  schema: z.ZodType,
  body: unknown,
  { labels, rename = (name) => name }: SchemaErrorOptions = {},
): { form?: string; fields: FieldErrors } | undefined {
  const parsed = schema.safeParse(body);
  if (parsed.success) return undefined;
  let form: string | undefined;
  const fields: FieldErrors = {};
  for (const issue of parsed.error.issues) {
    const path = fieldName(issue.path);
    if (!path) {
      form ??= issue.message;
      continue;
    }
    const name = rename(path);
    if (name in fields) continue;
    fields[name] = labels
      ? friendlyMessage(issue, labels[name] ?? "a value")
      : issue.message;
  }
  return { ...(form !== undefined && { form }), fields };
}

function friendlyMessage(issue: z.core.$ZodIssue, label: string): string {
  switch (issue.code) {
    case "too_small":
      return issue.origin === "string" && Number(issue.minimum) <= 1
        ? `Enter ${label}`
        : issue.origin === "string"
          ? `Use at least ${issue.minimum} characters`
          : `Choose ${label}`;
    case "too_big":
      return issue.origin === "string"
        ? `Use at most ${issue.maximum} characters`
        : `Choose ${label}`;
    case "invalid_value":
    case "invalid_type":
      return `Choose ${label}`;
    case "invalid_format":
      // An id is picked from a list, never typed: blank means not picked.
      return issue.format === "uuid" ? `Choose ${label}` : issue.message;
    default:
      return issue.message;
  }
}

/** A field's first error message: validators and the API both give strings. */
export function firstError(errors: ReadonlyArray<unknown>): string | undefined {
  for (const error of errors) {
    if (typeof error === "string" && error) return error;
  }
  return undefined;
}
