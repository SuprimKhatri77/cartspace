import {
  DISCOUNT_CODE_PATTERN,
  type DiscountCode,
  type DiscountCodeBody,
  type DiscountKind,
  type DiscountState,
} from "@repo/types";
import { formatPriceShort, fromCents, toCents } from "@/lib/money";
import { fromLocalInput, toLocalInput } from "./datetime";

/** "10% off" or "$5 off". */
export function discountAmount(
  code: Pick<DiscountCode, "kind" | "value">,
): string {
  return code.kind === "percent"
    ? `${code.value}% off`
    : `${formatPriceShort(code.value)} off`;
}

/** "10% off orders over $50", the conditions after the amount. */
export function discountSummary(
  code: Pick<
    DiscountCode,
    "kind" | "value" | "min_subtotal" | "once_per_customer"
  >,
): string {
  const parts = [discountAmount(code)];
  if (code.min_subtotal > 0) {
    parts.push(`orders over ${formatPriceShort(code.min_subtotal)}`);
  }
  return (
    parts.join(" ") + (code.once_per_customer ? ", once per customer" : "")
  );
}

/** "3 / 10" with a limit, else "3". */
export function discountUses(
  code: Pick<DiscountCode, "uses" | "max_redemptions">,
): string {
  return code.max_redemptions === null
    ? String(code.uses)
    : `${code.uses} / ${code.max_redemptions}`;
}

export const DISCOUNT_STATE_LABELS: Record<DiscountState, string> = {
  active: "Active",
  scheduled: "Scheduled",
  ended: "Ended",
  off: "Off",
};

/** Why an ended code ended: past its end, or every use taken. */
export function endedReason(
  code: Pick<DiscountCode, "uses" | "max_redemptions" | "ends_at">,
  now = new Date(),
): string | null {
  if (code.ends_at && new Date(code.ends_at) <= now) return "Past its end";
  if (code.max_redemptions !== null && code.uses >= code.max_redemptions) {
    return "Used up";
  }
  return null;
}

/** A saved code as a request body, unchanged except for `changes`. */
export function discountBodyFrom(
  code: DiscountCode,
  changes: Partial<DiscountCodeBody> = {},
): DiscountCodeBody {
  return {
    code: code.code,
    kind: code.kind,
    value: code.value,
    min_subtotal: code.min_subtotal,
    starts_at: code.starts_at,
    ends_at: code.ends_at,
    max_redemptions: code.max_redemptions,
    once_per_customer: code.once_per_customer,
    is_active: code.is_active,
    ...changes,
  };
}

/**
 * The discount dialog's fields, as typed, named like the body's so the
 * API's field errors land on them.
 */
export type DiscountForm = {
  code: string;
  kind: DiscountKind;
  /** A whole percent, or a dollar amount ("5" or "5.50"). */
  value: string;
  /** A dollar amount; empty for none. */
  min_subtotal: string;
  /** datetime-local values; empty for open-ended. */
  starts_at: string;
  ends_at: string;
  /** Uses allowed in all; empty for no limit. */
  max_redemptions: string;
  once_per_customer: boolean;
  is_active: boolean;
};

export const EMPTY_DISCOUNT_FORM: DiscountForm = {
  code: "",
  kind: "percent",
  value: "",
  min_subtotal: "",
  starts_at: "",
  ends_at: "",
  max_redemptions: "",
  once_per_customer: false,
  is_active: true,
};

export function discountFormFrom(code: DiscountCode): DiscountForm {
  return {
    code: code.code,
    kind: code.kind,
    value: code.kind === "percent" ? String(code.value) : fromCents(code.value),
    min_subtotal: code.min_subtotal > 0 ? fromCents(code.min_subtotal) : "",
    starts_at: toLocalInput(code.starts_at),
    ends_at: toLocalInput(code.ends_at),
    max_redemptions:
      code.max_redemptions === null ? "" : String(code.max_redemptions),
    once_per_customer: code.once_per_customer,
    is_active: code.is_active,
  };
}

/**
 * The request body for a form, or the fields to fix (the API's rules, with
 * messages written for this form). With the code being edited, a date left
 * as it was keeps its exact saved time (the inputs show minutes only).
 */
export function discountBody(
  form: DiscountForm,
  saved?: DiscountCode,
): { body: DiscountCodeBody } | { errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const code = form.code.trim();
  if (!DISCOUNT_CODE_PATTERN.test(code)) {
    errors.code = "Use 3 to 32 letters, numbers, hyphens or underscores";
  }

  let value: number | null = null;
  if (form.kind === "percent") {
    const n = Number(form.value);
    if (/^\d+$/.test(form.value.trim()) && n >= 1 && n <= 100) value = n;
    else errors.value = "Enter a percent from 1 to 100";
  } else {
    const cents = toCents(form.value);
    if (cents !== null && cents > 0) value = cents;
    else errors.value = "Enter an amount, like 5 or 5.50";
  }

  let minSubtotal = 0;
  if (form.min_subtotal.trim()) {
    const cents = toCents(form.min_subtotal);
    if (cents === null)
      errors.min_subtotal = "Enter an amount, or leave it empty";
    else minSubtotal = cents;
  }

  let limit: number | null = null;
  if (form.max_redemptions.trim()) {
    const n = Number(form.max_redemptions);
    if (/^\d+$/.test(form.max_redemptions.trim()) && n >= 1 && n <= 1_000_000)
      limit = n;
    else errors.max_redemptions = "Enter a whole number, or leave it empty";
  }

  const date = (value: string, was: string | null | undefined) =>
    was && value === toLocalInput(was) ? was : (fromLocalInput(value) ?? null);
  const startsAt = date(form.starts_at, saved?.starts_at);
  const endsAt = date(form.ends_at, saved?.ends_at);
  if (startsAt && endsAt && endsAt <= startsAt) {
    errors.ends_at = "The end must be after the start";
  }

  if (Object.keys(errors).length > 0 || value === null) return { errors };
  return {
    body: {
      code,
      kind: form.kind,
      value,
      min_subtotal: minSubtotal,
      starts_at: startsAt,
      ends_at: endsAt,
      max_redemptions: limit,
      once_per_customer: form.once_per_customer,
      is_active: form.is_active,
    },
  };
}
