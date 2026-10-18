import { describe, expect, test } from "bun:test";
import {
  productBody,
  productErrors,
  type ProductFormValues,
} from "@/modules/admin/lib/product-form";

const values: ProductFormValues = {
  name: "Linen Shirt",
  description: "Breezy.",
  category_id: "00000000-0000-4000-8000-000000000001",
  features: ["100% linen", " ", "Made in Portugal "],
  images: [{ url: "https://res.cloudinary.com/x/a.jpg", public_id: "a" }],
  is_active: true,
  is_featured: false,
};

describe("productBody", () => {
  test("every field, blank features left out, images split", () => {
    expect(productBody(values).body).toEqual({
      name: "Linen Shirt",
      description: "Breezy.",
      category_id: "00000000-0000-4000-8000-000000000001",
      features: ["100% linen", "Made in Portugal"],
      images: ["https://res.cloudinary.com/x/a.jpg"],
      image_public_ids: ["a"],
      is_active: true,
      is_featured: false,
    });
  });

  test("body rows map back past the blank one", () => {
    const { rename } = productBody(values);
    expect(rename("features[1]")).toBe("features[2]");
    expect(rename("features[0]")).toBe("features[0]");
    expect(rename("image_public_ids")).toBe("images");
    expect(rename("images[0]")).toBe("images");
    expect(rename("name")).toBe("name");
  });
});

describe("productErrors", () => {
  test("names what is missing", () => {
    expect(
      productErrors({
        ...values,
        name: "",
        description: "",
        category_id: "",
        images: [],
      })?.fields,
    ).toEqual({
      name: "Use at least 2 characters",
      description: "Enter a description",
      category_id: "Choose a category",
      images: "Choose at least one image",
    });
  });

  test("none for a good product", () => {
    expect(productErrors(values)).toBeUndefined();
  });
});
