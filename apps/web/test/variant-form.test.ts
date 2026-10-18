import { describe, expect, test } from "bun:test";
import {
  variantBody,
  variantErrors,
  type VariantFormValues,
} from "@/modules/admin/lib/variant-form";

const image = { url: "https://res.cloudinary.com/x/a.jpg", public_id: "a" };
const values: VariantFormValues = {
  properties: [
    { name: "Size", value: "M", type: "text" },
    { name: "Colour", value: "Black", type: "color" },
  ],
  selling_price: "49.50",
  offer_price: "",
  offer_expires_at: "2026-12-01T10:00",
  stock: "12",
  images: [image],
  is_default: true,
  is_active: true,
};

describe("variantBody", () => {
  test("a new variant in cents, without an empty offer or its end", () => {
    expect(variantBody(values, true).body).toEqual({
      images: [image.url],
      image_public_ids: ["a"],
      stock: 12,
      selling_price: 4950,
      is_default: true,
      is_active: true,
      properties: [
        { name: "Size", value: "M", type: "text" },
        { name: "Colour", value: "Black", type: "color" },
      ],
    });
  });

  test("an edit leaves out stock and options", () => {
    const { body } = variantBody({ ...values, offer_price: "39" }, false);
    expect(body).not.toHaveProperty("stock");
    expect(body).not.toHaveProperty("properties");
    expect(body).toMatchObject({ offer_price: 3900 });
  });

  test("prices as typed are checked here", () => {
    expect(
      variantBody({ ...values, selling_price: "4.999", stock: "x" }, true)
        .local,
    ).toEqual({
      selling_price: "Enter a price, like 49 or 49.50",
      stock: "Enter a whole number",
    });
  });
});

describe("variantErrors", () => {
  test("errors land on the row typed, past a blank one", () => {
    const errors = variantErrors(
      {
        ...values,
        properties: [
          { name: "", value: "", type: "text" },
          { name: "Size", value: "", type: "text" },
        ],
      },
      true,
    );
    expect(errors?.fields).toEqual({ "properties[1].value": "Enter a value" });
  });

  test("the image ids' errors are the images'", () => {
    const errors = variantErrors({ ...values, images: [] }, false);
    expect(Object.keys(errors?.fields ?? {})).toEqual(["images"]);
  });

  test("an offer must be below the price", () => {
    const errors = variantErrors({ ...values, offer_price: "60" }, false);
    expect(errors?.fields).toEqual({
      offer_price: "Offer price must be less than selling price",
    });
  });

  test("none for a good variant", () => {
    expect(variantErrors(values, true)).toBeUndefined();
  });
});
