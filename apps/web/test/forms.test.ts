import { describe, expect, test } from "bun:test";
import { AddressInputSchema, ReviewBodySchema } from "@repo/types";
import { friendlyFieldErrors } from "@/lib/forms";

describe("friendly form errors", () => {
  test("names what is missing", () => {
    const parsed = ReviewBodySchema.safeParse({
      rating: 0,
      title: " ",
      body: "",
    });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(
      friendlyFieldErrors(parsed.error, {
        rating: "a rating",
        title: "a title",
      }),
    ).toEqual({
      rating: "Choose a rating",
      title: "Enter a title",
      body: "Enter a value",
    });
  });

  test("lengths and choices", () => {
    const parsed = AddressInputSchema.safeParse({
      full_name: "x".repeat(81),
      phone: "123",
      line1: "1 Main",
      city: "X",
      postal_code: "1",
      country: "ZZ",
    });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(friendlyFieldErrors(parsed.error, { country: "a country" })).toEqual(
      {
        full_name: "Use at most 80 characters",
        phone: "Use at least 6 characters",
        country: "Choose a country",
      },
    );
  });
});
