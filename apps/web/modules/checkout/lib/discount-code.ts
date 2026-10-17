// The discount code a shopper applied at checkout, kept for this tab so it
// is still applied after they come back from a cancelled Stripe page.
// Best effort: storage can be unavailable.

const KEY = "cs-discount-code";

export function loadDiscountCode(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function saveDiscountCode(code: string | null): void {
  try {
    if (code) sessionStorage.setItem(KEY, code);
    else sessionStorage.removeItem(KEY);
  } catch {
    // Storage blocked: the code just isn't remembered.
  }
}
