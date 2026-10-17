import { expect, test } from "bun:test";
import { contentSecurityPolicy, createNonce } from "@/lib/proxy/csp";

function directives(policy: string): Map<string, string[]> {
  return new Map(
    policy.split("; ").map((d) => {
      const [name, ...values] = d.split(" ");
      return [name!, values];
    }),
  );
}

test("production policy: nonce scripts, the API and Cloudinary", () => {
  const csp = directives(
    contentSecurityPolicy({
      nonce: "abc",
      dev: false,
      apiUrl: "https://api.shop.example.com/",
    }),
  );
  expect(csp.get("script-src")).toEqual(["'self'", "'nonce-abc'"]);
  expect(csp.get("connect-src")).toEqual([
    "'self'",
    "https://api.shop.example.com",
    "https://api.cloudinary.com",
  ]);
  expect(csp.get("img-src")).toContain("https://res.cloudinary.com");
  expect(csp.get("frame-ancestors")).toEqual(["'none'"]);
  expect(csp.get("object-src")).toEqual(["'none'"]);
  expect(csp.has("upgrade-insecure-requests")).toBe(true);
});

test("dev allows eval and the HMR socket, and never upgrades", () => {
  const csp = directives(
    contentSecurityPolicy({
      nonce: "n",
      dev: true,
      apiUrl: "http://localhost:5000",
    }),
  );
  expect(csp.get("script-src")).toContain("'unsafe-eval'");
  expect(csp.get("connect-src")).toContain("ws:");
  expect(csp.get("connect-src")).toContain("http://localhost:5000");
  expect(csp.has("upgrade-insecure-requests")).toBe(false);
});

test("an http API (a local production build) is not upgraded", () => {
  const csp = directives(
    contentSecurityPolicy({
      nonce: "n",
      dev: false,
      apiUrl: "http://localhost:5000",
    }),
  );
  expect(csp.get("script-src")).not.toContain("'unsafe-eval'");
  expect(csp.has("upgrade-insecure-requests")).toBe(false);
});

test("a missing or malformed API URL is left out", () => {
  for (const apiUrl of [undefined, "", "not a url"]) {
    const csp = directives(
      contentSecurityPolicy({ nonce: "n", dev: false, apiUrl }),
    );
    expect(csp.get("connect-src")).toEqual([
      "'self'",
      "https://api.cloudinary.com",
    ]);
  }
});

test("nonces are random base64", () => {
  const a = createNonce();
  expect(a).toMatch(/^[A-Za-z0-9+/]{22}==$/);
  expect(createNonce()).not.toBe(a);
});
