import { describe, expect, test } from "bun:test";
import { SHIPPING_COUNTRIES } from "@repo/types";
import { COUNTRY_NAMES, countryName } from "@/modules/checkout/lib/countries";
import {
  formatOrderDate,
  formatShortDate,
  orderLabel,
  stepDate,
  timelineStep,
} from "@/modules/checkout/lib/orders";

describe("orders", () => {
  test("labels and dates", () => {
    expect(orderLabel(1042)).toBe("CS-1042");
    // UTC, so a late-evening order doesn't move a day between server and browser
    expect(formatOrderDate("2026-10-10T23:30:00Z")).toBe("10 October 2026");
  });

  test("timeline steps", () => {
    expect(timelineStep("paid")).toBe(0);
    expect(timelineStep("delivered")).toBe(2);
    expect(timelineStep("pending")).toBe(-1);
    expect(timelineStep("cancelled")).toBe(-1);
  });

  test("every shipping country has a name", () => {
    for (const code of SHIPPING_COUNTRIES) {
      expect(COUNTRY_NAMES[code]).toBeTruthy();
    }
    expect(countryName("XX")).toBe("XX");
  });

  test("step dates", () => {
    const order = {
      paid_at: "2026-10-10T09:00:00Z",
      shipped_at: "2026-10-11T23:30:00Z",
      delivered_at: null,
    };
    expect(stepDate(order, "paid")).toBe(order.paid_at);
    expect(stepDate(order, "delivered")).toBeNull();
    expect(stepDate(order, "pending")).toBeNull();
    expect(formatShortDate(order.shipped_at)).toBe("11 Oct");
  });
});
