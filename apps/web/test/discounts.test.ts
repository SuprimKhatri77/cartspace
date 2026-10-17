import { describe, expect, test } from "bun:test";
import type { DiscountCode } from "@repo/types";
import {
  discountBody,
  discountBodyFrom,
  discountFormFrom,
  discountSummary,
  discountUses,
  EMPTY_DISCOUNT_FORM,
  endedReason,
} from "@/modules/admin/lib/discounts";
import {
  adminDiscountsQuery,
  adminDiscountsSearch,
  parseAdminDiscountFilters,
} from "@/modules/admin/lib/order-filters";

const code: DiscountCode = {
  id: "00000000-0000-4000-8000-000000000001",
  code: "WELCOME10",
  kind: "percent",
  value: 10,
  min_subtotal: 5000,
  starts_at: null,
  ends_at: null,
  max_redemptions: null,
  once_per_customer: false,
  is_active: true,
  created_at: "2026-10-17T00:00:00Z",
  updated_at: "2026-10-17T00:00:00Z",
  uses: 3,
  state: "active",
};

describe("labels", () => {
  test("amount and conditions", () => {
    expect(discountSummary(code)).toBe("10% off orders over $50");
    expect(
      discountSummary({
        ...code,
        kind: "fixed",
        value: 550,
        min_subtotal: 0,
        once_per_customer: true,
      }),
    ).toBe("$5.50 off, once per customer");
  });

  test("uses with and without a limit", () => {
    expect(discountUses(code)).toBe("3");
    expect(discountUses({ ...code, max_redemptions: 10 })).toBe("3 / 10");
  });

  test("why an ended code ended", () => {
    const now = new Date("2026-11-01T00:00:00Z");
    expect(endedReason({ ...code, ends_at: "2026-10-31T00:00:00Z" }, now)).toBe(
      "Past its end",
    );
    expect(endedReason({ ...code, max_redemptions: 3 }, now)).toBe("Used up");
    expect(endedReason(code, now)).toBeNull();
  });
});

describe("discountBody", () => {
  const form = { ...EMPTY_DISCOUNT_FORM, code: "SUMMER-25", value: "25" };

  test("a percent code with no conditions", () => {
    expect(discountBody(form)).toEqual({
      body: {
        code: "SUMMER-25",
        kind: "percent",
        value: 25,
        min_subtotal: 0,
        starts_at: null,
        ends_at: null,
        max_redemptions: null,
        once_per_customer: false,
        is_active: true,
      },
    });
  });

  test("a fixed amount, minimum spend and limit in cents and numbers", () => {
    const result = discountBody({
      ...form,
      kind: "fixed",
      value: "5.50",
      minSpend: "40",
      limit: "100",
      once: true,
    });
    expect(result).toMatchObject({
      body: {
        value: 550,
        min_subtotal: 4000,
        max_redemptions: 100,
        once_per_customer: true,
      },
    });
  });

  test("refuses what the API would", () => {
    const errors = (f: typeof form) =>
      "errors" in discountBody(f)
        ? Object.keys((discountBody(f) as { errors: object }).errors)
        : [];
    expect(errors({ ...form, code: "ab" })).toEqual(["code"]);
    expect(errors({ ...form, code: "-SALE" })).toEqual(["code"]);
    expect(errors({ ...form, value: "0" })).toEqual(["value"]);
    expect(errors({ ...form, value: "101" })).toEqual(["value"]);
    expect(errors({ ...form, value: "12.5" })).toEqual(["value"]);
    expect(errors({ ...form, kind: "fixed", value: "0" })).toEqual(["value"]);
    expect(errors({ ...form, kind: "fixed", value: "5.555" })).toEqual([
      "value",
    ]);
    expect(errors({ ...form, minSpend: "abc" })).toEqual(["min_subtotal"]);
    expect(errors({ ...form, limit: "0" })).toEqual(["max_redemptions"]);
    expect(
      errors({
        ...form,
        startsAt: "2026-11-02T10:00",
        endsAt: "2026-11-02T10:00",
      }),
    ).toEqual(["ends_at"]);
  });

  test("a saved code round-trips through the form", () => {
    const saved = {
      ...code,
      kind: "fixed" as const,
      value: 1250,
      max_redemptions: 5,
      ends_at: "2026-12-01T12:00:00.000Z",
    };
    const result = discountBody(discountFormFrom(saved));
    expect(result).toMatchObject({
      body: {
        code: "WELCOME10",
        kind: "fixed",
        value: 1250,
        min_subtotal: 5000,
        max_redemptions: 5,
        ends_at: "2026-12-01T12:00:00.000Z",
      },
    });
  });
});

test("an edit keeps untouched saved times exactly", () => {
  const saved = { ...code, starts_at: "2026-11-01T09:00:30.123Z" };
  const form = discountFormFrom(saved);
  expect(discountBody(form, saved)).toMatchObject({
    body: { starts_at: "2026-11-01T09:00:30.123Z", ends_at: null },
  });
  expect(
    discountBody({ ...form, startsAt: "2026-11-02T10:00" }, saved),
  ).toMatchObject({
    body: { starts_at: new Date("2026-11-02T10:00").toISOString() },
  });
});

test("discountBodyFrom keeps the saved times exactly", () => {
  const saved = { ...code, starts_at: "2026-11-01T09:00:30.123Z" };
  expect(discountBodyFrom(saved, { is_active: false })).toMatchObject({
    starts_at: "2026-11-01T09:00:30.123Z",
    is_active: false,
    code: "WELCOME10",
  });
});

describe("filters", () => {
  test("parse, query and search", () => {
    const f = parseAdminDiscountFilters({
      state: "ended",
      q: " sale ",
      page: "2",
    });
    expect(f).toEqual({ page: 2, q: "sale", state: "ended" });
    expect(adminDiscountsQuery(f)).toEqual({
      page: 2,
      q: "sale",
      state: "ended",
    });
    expect(adminDiscountsSearch(f)).toBe("?q=sale&state=ended&page=2");
    expect(parseAdminDiscountFilters({ state: "bogus" }).state).toBe("");
  });
});
