import {
  CreateVariantBodySchema,
  UpdateVariantBodySchema,
  type AdminVariant,
  type CreateVariantBody,
  type OptionType,
  type UpdateVariantBody,
} from "@repo/types";
import { schemaErrors, type FieldErrors } from "@/lib/form/validate";
import { fromCents, toCents } from "@/lib/money";
import { fromLocalInput, toLocalInput } from "./datetime";
import type { StoredImage } from "./upload";

export type VariantProperty = { name: string; value: string; type: OptionType };

/** The variant dialog's fields, as typed, named like the body's. */
export type VariantFormValues = {
  /** A new variant's options; blank rows are left out. */
  properties: VariantProperty[];
  /** Dollar amounts ("49" or "49.50"); the offer may be empty. */
  selling_price: string;
  offer_price: string;
  /** A datetime-local value; empty for an open-ended offer. */
  offer_expires_at: string;
  /** A new variant's count; an existing one's is set in the table. */
  stock: string;
  images: StoredImage[];
  is_default: boolean;
  is_active: boolean;
};

export function variantFormFrom({
  variant,
  options,
  productImages,
  first,
}: {
  variant?: AdminVariant;
  options: { name: string; type: OptionType }[];
  productImages: StoredImage[];
  first: boolean;
}): VariantFormValues {
  return {
    properties: options.map((o) => ({ ...o, value: "" })),
    selling_price: variant ? fromCents(variant.selling_price) : "",
    offer_price: variant?.offer_price ? fromCents(variant.offer_price) : "",
    offer_expires_at: toLocalInput(variant?.offer_expires_at ?? null),
    stock: "",
    images: variant
      ? variant.images.map((url, i) => ({
          url,
          public_id: variant.image_public_ids[i] ?? "",
        }))
      : productImages.slice(0, 1),
    is_default: variant?.is_default ?? first,
    is_active: variant?.is_active ?? true,
  };
}

/**
 * The request body for the form (`isNew`: create, with stock and options),
 * the problems the schema can't see in it (prices as typed), and `rename`,
 * which maps a body path back to the form's field: blank option rows are
 * left out of the body, so its properties[1] can be the form's
 * properties[2], and the image ids' errors belong to the images.
 */
export function variantBody(
  values: VariantFormValues,
  isNew: boolean,
): {
  body: CreateVariantBody | UpdateVariantBody;
  local: FieldErrors;
  rename: (name: string) => string;
} {
  const local: FieldErrors = {};
  const selling = toCents(values.selling_price);
  const offer = values.offer_price.trim()
    ? toCents(values.offer_price)
    : undefined;
  if (selling === null) {
    local.selling_price = "Enter a price, like 49 or 49.50";
  }
  if (offer === null) local.offer_price = "Enter a price, like 39 or 39.50";
  if (isNew && !/^\d+$/.test(values.stock.trim())) {
    local.stock = "Enter a whole number";
  }

  const kept: number[] = [];
  const properties = values.properties
    .map((p) => ({ ...p, name: p.name.trim(), value: p.value.trim() }))
    .filter((p, i) => {
      if (!p.name && !p.value) return false;
      kept.push(i);
      return true;
    });
  const expires = fromLocalInput(values.offer_expires_at);

  const body = {
    images: values.images.map((i) => i.url),
    image_public_ids: values.images.map((i) => i.public_id),
    ...(isNew && { stock: Number(values.stock) }),
    selling_price: selling ?? 0,
    // Clearing the offer clears its end too.
    ...(offer != null && {
      offer_price: offer,
      ...(expires && { offer_expires_at: expires }),
    }),
    is_default: values.is_default,
    is_active: values.is_active,
    ...(isNew && { properties }),
  } as CreateVariantBody | UpdateVariantBody;

  const rename = (name: string) =>
    name
      .replace(/^image_public_ids\b.*/, "images")
      .replace(/^images\[\d+\]/, "images")
      .replace(
        /^properties\[(\d+)\]/,
        (_, j: string) => `properties[${kept[Number(j)] ?? j}]`,
      );
  return { body, local, rename };
}

/** The form's errors: the schema's, worded for the dialog, and the local ones. */
export function variantErrors(
  values: VariantFormValues,
  isNew: boolean,
): { fields: FieldErrors } | undefined {
  const { body, local, rename } = variantBody(values, isNew);
  const labels: Record<string, string> = {
    images: "at least one image",
    stock: "a count up to 10,000",
    selling_price: "a price up to $1,000,000",
  };
  values.properties.forEach((_, i) => {
    labels[`properties[${i}].name`] = "an option name";
    labels[`properties[${i}].value`] = "a value";
  });
  const schema = isNew ? CreateVariantBodySchema : UpdateVariantBodySchema;
  const fields = {
    ...schemaErrors(schema, body, { labels, rename })?.fields,
    // The typed prices explain more than "Choose a price".
    ...local,
  };
  return Object.keys(fields).length > 0 ? { fields } : undefined;
}
