#!/usr/bin/env bun
/**
 * Seeds a demo catalog through the running API as the seeded admin, so it
 * goes through the same validation, slug, SKU and option logic as the admin
 * endpoints. Idempotent: categories and products that already exist (by
 * name) are skipped.
 *
 *   bun run db:seed && bun run db:seed:catalog
 *
 * Needs SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD (root .env.local) and the API
 * at SEED_API_URL (default NEXT_PUBLIC_API_URL). Images are public samples
 * from Cloudinary's "demo" cloud.
 */
// Relative imports: the root package doesn't depend on the workspace ones.
import {
  adminCreateCategory,
  adminCreateProduct,
  adminCreateVariant,
  adminListCategories,
  adminListProducts,
  createServerClient,
  login,
  type Client,
  type CreateVariantBody,
} from "../packages/api-client/src/server.ts";

const IMG = "https://res.cloudinary.com/demo/image/upload";

type SeedVariant = Omit<CreateVariantBody, "images" | "image_public_ids"> & {
  image?: string;
};

type SeedProduct = {
  name: string;
  category: string;
  image: string;
  description: string;
  features?: string[];
  is_active?: boolean;
  is_featured?: boolean;
  variants: SeedVariant[];
};

// [name, parent]
const categories: [string, string | null][] = [
  ["Clothing", null],
  ["Shirts", "Clothing"],
  ["Shoes", "Clothing"],
  ["Accessories", null],
  ["Bags", "Accessories"],
  ["Watches", "Accessories"],
  ["Eyewear", "Accessories"],
  ["Home", null],
  ["Furniture", "Home"],
  ["Kitchen", "Home"],
  ["Gift Cards", null], // stays empty
];

const size = (value: string) => ({
  name: "size",
  value,
  type: "text" as const,
});
const color = (value: string) => ({
  name: "color",
  value,
  type: "color" as const,
});

const products: SeedProduct[] = [
  {
    name: "Classic Polo Shirt",
    category: "Shirts",
    image: "shirt",
    description: "A breathable cotton polo for every day.",
    features: ["100% cotton", "Regular fit", "Machine washable"],
    is_featured: true,
    variants: [
      {
        selling_price: 2900,
        stock: 25,
        is_default: true,
        is_active: true,
        properties: [size("M")],
      },
      {
        selling_price: 2900,
        stock: 10,
        is_default: false,
        is_active: true,
        properties: [size("S")],
      },
      {
        selling_price: 3100,
        stock: 0,
        is_default: false,
        is_active: true,
        properties: [size("L")],
      },
    ],
  },
  {
    name: "Studio Basics Set",
    category: "Shirts",
    image: "docs/models",
    description: "Layering basics in neutral tones.",
    features: ["Three pieces", "Mix and match"],
    variants: [
      {
        selling_price: 5900,
        offer_price: 4900,
        stock: 12,
        is_default: true,
        is_active: true,
      },
    ],
  },
  {
    name: "Purple Running Shoes",
    category: "Shoes",
    image: "samples/ecommerce/shoes",
    description: "Lightweight runners with a cushioned sole.",
    features: ["Mesh upper", "Foam midsole", "Reflective details"],
    is_featured: true,
    variants: [
      {
        selling_price: 8900,
        stock: 8,
        is_default: true,
        is_active: true,
        properties: [size("42"), color("Purple")],
      },
      {
        selling_price: 8900,
        stock: 5,
        is_default: false,
        is_active: true,
        properties: [size("41"), color("Purple")],
      },
      {
        selling_price: 8900,
        stock: 2,
        is_default: false,
        is_active: true,
        properties: [size("40"), color("Purple")],
      },
      // Inactive: must never show on the storefront.
      {
        selling_price: 8900,
        stock: 9,
        is_default: false,
        is_active: false,
        properties: [size("43"), color("Purple")],
      },
    ],
  },
  {
    name: "Canvas Sneakers",
    category: "Shoes",
    image: "sneakers",
    description: "Low-top canvas sneakers in denim blue.",
    features: ["Canvas upper", "Rubber sole"],
    variants: [
      {
        selling_price: 4500,
        stock: 30,
        is_default: true,
        is_active: true,
        properties: [size("42")],
      },
      {
        selling_price: 4500,
        stock: 14,
        is_default: false,
        is_active: true,
        properties: [size("44")],
      },
    ],
  },
  {
    name: "Black Trainers",
    category: "Shoes",
    image: "docs/shoes",
    description: "Everyday trainers with a grippy outsole.",
    variants: [
      {
        selling_price: 7400,
        offer_price: 5900,
        stock: 6,
        is_default: true,
        is_active: true,
      },
    ],
  },
  {
    name: "Leather Messenger Bag",
    category: "Bags",
    image: "samples/ecommerce/leather-bag-gray",
    description: "Full-grain leather with a canvas flap.",
    features: ["Fits a 14-inch laptop", "Adjustable strap"],
    is_featured: true,
    variants: [
      { selling_price: 15900, stock: 4, is_default: true, is_active: true },
    ],
  },
  {
    name: "Day Backpack",
    category: "Bags",
    image: "backpack",
    description: "A compact backpack for the city.",
    variants: [
      {
        selling_price: 6900,
        stock: 11,
        is_default: true,
        is_active: true,
        properties: [color("Pink")],
      },
      {
        selling_price: 6900,
        stock: 7,
        is_default: false,
        is_active: true,
        properties: [color("Black")],
        image: "samples/ecommerce/accessories-bag",
      },
    ],
  },
  {
    name: "Analog Classic Watch",
    category: "Watches",
    image: "samples/ecommerce/analog-classic",
    description: "A steel watch on a tan leather strap.",
    features: ["Water resistant to 50 m", "Sapphire glass"],
    variants: [
      {
        selling_price: 24900,
        offer_price: 19900,
        stock: 3,
        is_default: true,
        is_active: true,
      },
    ],
  },
  {
    name: "Rose Aviator Sunglasses",
    category: "Eyewear",
    image: "sunglasses",
    description: "Mirrored aviators with UV400 lenses.",
    variants: [
      { selling_price: 3900, stock: 20, is_default: true, is_active: true },
    ],
  },
  {
    name: "Travel Essentials Kit",
    category: "Accessories", // directly on a root category
    image: "samples/ecommerce/accessories-bag",
    description: "Everything for a weekend away.",
    variants: [
      { selling_price: 9900, stock: 9, is_default: true, is_active: true },
    ],
  },
  {
    name: "Orange Lounge Chair",
    category: "Furniture",
    image: "chair",
    description: "A mid-century lounge chair.",
    variants: [
      { selling_price: 32900, stock: 2, is_default: true, is_active: true },
    ],
  },
  {
    name: "Espresso Cup Set",
    category: "Kitchen",
    image: "coffee",
    description: "Four porcelain espresso cups with saucers.",
    variants: [
      { selling_price: 2400, stock: 40, is_default: true, is_active: true },
    ],
  },
  {
    // Inactive product: must never show on the storefront.
    name: "Retired Sneaker",
    category: "Shoes",
    image: "shoes",
    description: "No longer sold.",
    is_active: false,
    variants: [
      { selling_price: 3000, stock: 5, is_default: true, is_active: true },
    ],
  },
  {
    // Its default variant is inactive, so the product is hidden too.
    name: "City Bike",
    category: "Home",
    image: "bike",
    description: "Default variant inactive: hidden from the storefront.",
    variants: [
      { selling_price: 45900, stock: 1, is_default: true, is_active: false },
    ],
  },
];

function fail(step: string, error: unknown): never {
  throw new Error(`${step} failed: ${JSON.stringify(error)}`);
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

async function signIn(baseUrl: string): Promise<Client> {
  const { data, error, response } = await login({
    client: createServerClient({ baseUrl }),
    body: {
      email: requireEnv("SEED_ADMIN_EMAIL"),
      password: requireEnv("SEED_ADMIN_PASSWORD"),
    },
  });
  if (!data) fail("login", error);
  if (data.data.role !== "admin")
    throw new Error("SEED_ADMIN_EMAIL is not an admin");

  const access = response.headers
    .getSetCookie()
    .map((c) => c.split(";", 1)[0] ?? "")
    .find((c) => c.startsWith("access_token="));
  if (!access) throw new Error("login set no access_token cookie");
  return createServerClient({ baseUrl, headers: { cookie: access } });
}

async function existingCategories(
  client: Client,
): Promise<Map<string, string>> {
  const byName = new Map<string, string>();
  for (let page = 1; ; page++) {
    const { data, error } = await adminListCategories({
      client,
      query: { page },
    });
    if (!data) fail("list categories", error);
    data.data.forEach((c) => byName.set(c.name, c.id));
    if (page >= data.meta.total_pages) return byName;
  }
}

async function existingProducts(client: Client): Promise<Set<string>> {
  const names = new Set<string>();
  for (let page = 1; ; page++) {
    const { data, error } = await adminListProducts({
      client,
      query: { page },
    });
    if (!data) fail("list products", error);
    data.data.forEach((p) => names.add(p.name));
    if (page >= data.meta.total_pages) return names;
  }
}

async function main() {
  const baseUrl = process.env.SEED_API_URL || requireEnv("NEXT_PUBLIC_API_URL");
  const client = await signIn(baseUrl);

  const categoryIds = await existingCategories(client);
  let createdCategories = 0;
  for (const [name, parent] of categories) {
    if (categoryIds.has(name)) continue;
    const parentId = parent ? categoryIds.get(parent) : undefined;
    const { data, error } = await adminCreateCategory({
      client,
      body: { name, ...(parentId ? { parent_id: parentId } : {}) },
    });
    if (!data) fail(`create category ${name}`, error);
    categoryIds.set(name, data.data.id);
    createdCategories++;
  }

  const productNames = await existingProducts(client);
  let createdProducts = 0;
  for (const p of products) {
    if (productNames.has(p.name)) continue;
    const categoryId = categoryIds.get(p.category);
    if (!categoryId) throw new Error(`unknown category ${p.category}`);

    const { data, error } = await adminCreateProduct({
      client,
      body: {
        name: p.name,
        description: p.description,
        features: p.features ?? [],
        category_id: categoryId,
        images: [`${IMG}/${p.image}.jpg`],
        image_public_ids: [p.image],
        is_active: p.is_active ?? true,
        is_featured: p.is_featured ?? false,
      },
    });
    if (!data) fail(`create product ${p.name}`, error);

    for (const { image = p.image, ...variant } of p.variants) {
      const { error: variantError } = await adminCreateVariant({
        client,
        path: { productID: data.data.id },
        body: {
          ...variant,
          images: [`${IMG}/${image}.jpg`],
          image_public_ids: [image],
        },
      });
      if (variantError) fail(`create variant of ${p.name}`, variantError);
    }
    createdProducts++;
  }

  console.log(
    `catalog seeded: ${createdCategories} categories and ${createdProducts} products created`,
  );
}

await main();
