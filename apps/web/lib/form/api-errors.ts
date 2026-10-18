import type { AnyFieldApi, AnyFormApi } from "@tanstack/react-form";
import { getApiError, mapFieldErrors } from "@/lib/api/errors";
import { fieldName } from "./validate";

export type ApiErrorOptions = {
  /** Maps an API field path to the form's field ("address.city" → "city"). */
  rename?: (name: string) => string;
  /**
   * Refusals that belong on a field though the API names none, by code:
   * { CATEGORY_ALREADY_EXISTS: { field: "name", message: "…" } }. The
   * message defaults to the API's.
   */
  codes?: Record<string, { field: string; message?: string }>;
};

/**
 * Puts an API refusal's field errors on the form's fields, as server
 * errors: each stays until its field is edited or the form is submitted
 * again (the field components and `Form` clear them; TanStack Form only
 * clears form-level server errors itself). Returns `applied`, whether any field took one, and `message`,
 * the API's message when none did, for a toast. Anything that isn't an
 * API error (a network failure) applies nothing and has no message, so
 * the caller's fallback wording shows.
 */
export function applyApiErrors(
  form: AnyFormApi,
  err: unknown,
  { rename = (name) => name, codes }: ApiErrorOptions = {},
): { applied: boolean; message: string | undefined } {
  const apiError = getApiError(err);
  if (!apiError) return { applied: false, message: undefined };

  const errors: Record<string, string> = {};
  const coded = codes?.[apiError.code];
  if (coded) errors[coded.field] = coded.message ?? apiError.message;
  for (const [path, message] of Object.entries(
    mapFieldErrors(apiError.errors),
  )) {
    const name = rename(fieldName(path));
    errors[name] ??= message;
  }

  let applied = false;
  for (const [name, message] of Object.entries(errors)) {
    // Only fields on screen: an error nobody can see would block nothing
    // and explain nothing, so it falls through to the toast instead.
    if (!form.fieldInfo[name]?.instance) continue;
    form.setFieldMeta(name, (meta) => ({
      ...meta,
      errorMap: { ...meta.errorMap, onServer: message },
    }));
    applied = true;
  }
  return { applied, message: applied ? undefined : apiError.message };
}

/** Clears a field's server error, once its value changes. */
export function clearServerError(field: AnyFieldApi) {
  if (field.state.meta.errorMap.onServer === undefined) return;
  field.setErrorMap({ onServer: undefined });
}

/** Clears every field's server error, before the form is sent again. */
export function clearServerErrors(form: AnyFormApi) {
  for (const [name, info] of Object.entries(form.fieldInfo)) {
    if (
      !info?.instance ||
      form.getFieldMeta(name)?.errorMap.onServer === undefined
    ) {
      continue;
    }
    form.setFieldMeta(name, (meta) => ({
      ...meta,
      errorMap: { ...meta.errorMap, onServer: undefined },
    }));
  }
}
