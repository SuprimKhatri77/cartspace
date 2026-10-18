import { ProductBodySchema, type Product, type ProductBody } from "@repo/types";
import { schemaErrors, type FieldErrors } from "@/lib/form/validate";
import type { StoredImage } from "./upload";

/** The product form's fields, named like the body's. */
export type ProductFormValues = {
  name: string;
  description: string;
  /** Empty until one is picked. */
  category_id: string;
  /** Blank rows are left out of the body. */
  features: string[];
  images: StoredImage[];
  is_active: boolean;
  is_featured: boolean;
};

export function productFormFrom(product?: Product): ProductFormValues {
  return {
    name: product?.name ?? "",
    description: product?.description ?? "",
    category_id: product?.category_id ?? "",
    features: product?.features ?? [],
    images: (product?.images ?? []).map((url, i) => ({
      url,
      public_id: product?.image_public_ids[i] ?? "",
    })),
    is_active: product?.is_active ?? true,
    is_featured: product?.is_featured ?? false,
  };
}

/**
 * The request body for the form (every field: the API's PUT replaces the
 * product), and `rename`, which maps a body path back to the form's field:
 * blank feature rows are left out, so the body's features[1] can be the
 * form's features[2], and the image ids' errors belong to the images.
 */
export function productBody(values: ProductFormValues): {
  body: ProductBody;
  rename: (name: string) => string;
} {
  const kept: number[] = [];
  const features = values.features
    .map((f) => f.trim())
    .filter((f, i) => {
      if (!f) return false;
      kept.push(i);
      return true;
    });
  const { images, ...rest } = values;
  const body = {
    ...rest,
    features,
    images: images.map((i) => i.url),
    image_public_ids: images.map((i) => i.public_id),
  };
  const rename = (name: string) =>
    name
      .replace(/^image_public_ids\b.*/, "images")
      .replace(/^images\[\d+\]/, "images")
      .replace(
        /^features\[(\d+)\]/,
        (_, j: string) => `features[${kept[Number(j)] ?? j}]`,
      );
  return { body, rename };
}

const labels: Record<string, string> = {
  name: "a name",
  description: "a description",
  category_id: "a category",
  images: "at least one image",
};

/** The form's errors, worded for it, on the fields typed. */
export function productErrors(
  values: ProductFormValues,
): { fields: FieldErrors } | undefined {
  const { body, rename } = productBody(values);
  return schemaErrors(ProductBodySchema, body, { labels, rename });
}
