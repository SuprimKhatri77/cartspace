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

// Image specs: a public ID with optional Cloudinary transformations in front.
// Studio shots on white are padded to the 4:5 card ratio; photos are cropped
// to it (g_auto keeps the subject). Detail crops only come from large
// originals so they stay sharp.
const pad = (id: string) => `c_pad,ar_4:5,b_white/${id}`;
const fill = (id: string, gravity = "auto") =>
  `c_fill,g_${gravity},ar_4:5/${id}`;
const detail = (id: string, gravity = "center", zoom = 0.55) =>
  `c_crop,g_${gravity},w_${zoom},h_${zoom}/c_fill,g_auto,ar_4:5/${id}`;
// A pixel region of a photo (x offset and width), e.g. one person in a pair.
const region = (id: string, x: number, width: number) =>
  `c_crop,x_${x},y_0,w_${width},h_1200/c_fill,g_north,ar_4:5/${id}`;

type SeedVariant = Omit<CreateVariantBody, "images" | "image_public_ids"> & {
  images?: string[];
};

type SeedProduct = {
  name: string;
  category: string;
  images: string[];
  description: string;
  features?: string[];
  is_active?: boolean;
  is_featured?: boolean;
  variants: SeedVariant[];
};

// [name, parent]
const categories: [string, string | null][] = [
  ["Clothing", null],
  ["Tops", "Clothing"],
  ["Knitwear", "Clothing"],
  ["Outerwear", "Clothing"],
  ["Shoes", "Clothing"],
  ["Accessories", null],
  ["Bags", "Accessories"],
  ["Watches", "Accessories"],
  ["Eyewear", "Accessories"],
  ["Jewellery", "Accessories"],
  ["Home", null],
  ["Furniture", "Home"],
  ["Kitchen", "Home"],
  ["Decor", "Home"],
  ["Audio", null],
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

/** One active variant per size; sizes listed in soldOut have no stock. */
function sized(
  price: number,
  sizes: string[],
  opts: {
    stock?: number;
    soldOut?: string[];
    offer?: number;
    colour?: string;
  } = {},
): SeedVariant[] {
  return sizes.map((s, i) => ({
    selling_price: price,
    ...(opts.offer ? { offer_price: opts.offer } : {}),
    stock: opts.soldOut?.includes(s) ? 0 : (opts.stock ?? 12) - i,
    is_default: i === Math.floor(sizes.length / 2),
    is_active: true,
    properties: opts.colour ? [size(s), color(opts.colour)] : [size(s)],
  }));
}

const single = (
  price: number,
  stock: number,
  extra: Partial<SeedVariant> = {},
): SeedVariant[] => [
  { selling_price: price, stock, is_default: true, is_active: true, ...extra },
];

const products: SeedProduct[] = [
  // Tops
  {
    name: "Classic Polo Shirt",
    category: "Tops",
    images: [pad("shirt")],
    description:
      "A breathable piqué polo cut from long-staple cotton, with a soft knitted collar that keeps its shape wash after wash.",
    features: ["100% cotton piqué", "Regular fit", "Mother-of-pearl buttons"],
    variants: sized(2900, ["S", "M", "L"], { soldOut: ["L"] }),
  },
  {
    name: "Everyday Cotton Tee",
    category: "Tops",
    images: [pad("tshirt")],
    description:
      "Our heavyweight jersey tee in a washed sky blue. Boxy through the body, with a ribbed neck that sits close.",
    features: ["220 gsm organic cotton", "Relaxed fit", "Pre-shrunk"],
    variants: sized(1900, ["XS", "S", "M", "L", "XL"], {
      offer: 1500,
      colour: "Sky",
    }),
  },
  // Knitwear
  {
    name: "Merino Crew Sweater",
    category: "Knitwear",
    images: [fill("jeans", "north")],
    description:
      "Fine-gauge extra-fine merino in a deep rust. Light enough to layer, warm enough to wear alone.",
    features: [
      "Extra-fine merino wool",
      "Ribbed cuffs and hem",
      "Hand wash cold",
    ],
    variants: sized(8900, ["S", "M", "L", "XL"], { colour: "Rust" }),
  },
  {
    name: "Chunky Roll-Neck",
    category: "Knitwear",
    images: [fill("docs/blue_sweater")],
    description:
      "A lofty, hand-finished roll-neck in a vivid azure. Knitted from a soft wool and alpaca blend.",
    features: ["Wool and alpaca blend", "Oversized fit", "Dry clean"],
    is_featured: true,
    variants: sized(12900, ["S", "M", "L"], { colour: "Azure", stock: 6 }),
  },
  {
    name: "Striped Cabin Knit",
    category: "Knitwear",
    images: [fill("samples/outdoor-woman", "north")],
    description:
      "A cropped, chunky stripe in ecru and tan, made for cold mornings by the water.",
    features: ["Lambswool blend", "Cropped length", "Dropped shoulder"],
    variants: sized(9900, ["XS", "S", "M"], { offer: 7900 }),
  },
  {
    name: "Ribbed Turtleneck",
    category: "Knitwear",
    images: [
      fill("samples/two-ladies"),
      detail("samples/two-ladies", "north", 0.6),
    ],
    description:
      "A close-fitting rib turtleneck in a soft cotton-cashmere blend. Two colours, endlessly useful.",
    features: ["Cotton and cashmere blend", "Slim fit", "Machine washable"],
    is_featured: true,
    variants: [
      {
        selling_price: 6900,
        stock: 9,
        is_default: true,
        is_active: true,
        properties: [size("M"), color("Mustard")],
        images: [region("samples/two-ladies", 180, 760)],
      },
      {
        selling_price: 6900,
        stock: 4,
        is_default: false,
        is_active: true,
        properties: [size("S"), color("Mustard")],
        images: [region("samples/two-ladies", 180, 760)],
      },
      {
        selling_price: 6900,
        stock: 7,
        is_default: false,
        is_active: true,
        properties: [size("M"), color("Black")],
        images: [region("samples/two-ladies", 800, 700)],
      },
      {
        selling_price: 6900,
        stock: 0,
        is_default: false,
        is_active: true,
        properties: [size("S"), color("Black")],
        images: [region("samples/two-ladies", 800, 700)],
      },
    ],
  },
  // Outerwear
  {
    name: "Leather Biker Jacket",
    category: "Outerwear",
    images: [fill("samples/look-up")],
    description:
      "A lean biker in buttery lambskin with brushed silver hardware. It only gets better with age.",
    features: ["Lambskin leather", "Quilted viscose lining", "Asymmetric zip"],
    variants: sized(38900, ["S", "M", "L"], { offer: 32900, stock: 4 }),
  },
  {
    name: "Washed Denim Jacket",
    category: "Outerwear",
    images: [fill("docs/model"), detail("docs/model", "north", 0.5)],
    description:
      "A classic trucker in mid-wash selvedge denim, softened with a long enzyme wash.",
    features: ["13 oz selvedge denim", "Two chest pockets", "Made in Portugal"],
    variants: sized(11900, ["S", "M", "L", "XL"]),
  },
  {
    name: "Lavender Fleece Hoodie",
    category: "Outerwear",
    images: [
      fill("samples/man-portrait"),
      detail("samples/man-portrait", "center", 0.5),
    ],
    description:
      "Brushed-back fleece in a washed lavender, with a double-layer hood and deep kangaroo pocket.",
    features: ["Organic cotton fleece", "Relaxed fit", "Garment dyed"],
    is_featured: true,
    variants: sized(7900, ["S", "M", "L", "XL"], { colour: "Lavender" }),
  },
  // Shoes
  {
    name: "Purple Running Shoes",
    category: "Shoes",
    images: [pad("samples/ecommerce/shoes")],
    description:
      "Lightweight runners with a cushioned foam midsole and a breathable mesh upper.",
    features: ["Engineered mesh upper", "Foam midsole", "Reflective details"],
    variants: [
      ...sized(8900, ["40", "41", "42"], { colour: "Purple", stock: 8 }),
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
    images: [fill("sneakers"), detail("sneakers", "center", 0.5)],
    description:
      "Low-top canvas sneakers in a deep denim blue, on a vulcanised gum sole.",
    features: ["Cotton canvas upper", "Vulcanised rubber sole"],
    variants: sized(4500, ["40", "42", "44"], { colour: "Denim", stock: 20 }),
  },
  {
    name: "Black Trainers",
    category: "Shoes",
    images: [fill("docs/shoes"), detail("docs/shoes", "east", 0.5)],
    description:
      "Everyday knit trainers with a grippy outsole and a neon footbed.",
    features: ["Knitted upper", "Recycled rubber outsole"],
    variants: sized(7400, ["41", "42", "43"], { offer: 5900, stock: 6 }),
  },
  {
    // Inactive product: must never show on the storefront.
    name: "Retired Sneaker",
    category: "Shoes",
    images: [pad("shoes")],
    description: "No longer sold.",
    is_active: false,
    variants: single(3000, 5),
  },
  // Bags
  {
    name: "Leather Messenger Bag",
    category: "Bags",
    images: [
      fill("samples/ecommerce/leather-bag-gray"),
      detail("samples/ecommerce/leather-bag-gray", "south", 0.5),
    ],
    description:
      "Full-grain leather with a waxed canvas flap and solid brass buckles. Fits a 14-inch laptop.",
    features: [
      "Full-grain leather",
      "Fits a 14-inch laptop",
      "Adjustable strap",
    ],
    is_featured: true,
    variants: single(15900, 4),
  },
  {
    name: "Day Backpack",
    category: "Bags",
    images: [fill("backpack")],
    description:
      "A compact roll-top backpack for the city, in a cheerful coral.",
    features: ["Water-resistant canvas", "Padded laptop sleeve"],
    variants: single(6900, 11, { properties: [color("Coral")] }),
  },
  {
    name: "Weekend Carry Set",
    category: "Bags",
    images: [
      fill("samples/ecommerce/accessories-bag"),
      detail("samples/ecommerce/accessories-bag", "north_east", 0.45),
      detail("samples/ecommerce/accessories-bag", "south_west", 0.45),
    ],
    description:
      "Everything for two days away: a leather pouch, a canvas tote and a scarf, packed flat.",
    features: ["Leather pouch", "Canvas tote", "Cotton scarf"],
    variants: single(9900, 9),
  },
  // Watches, eyewear, jewellery, small goods
  {
    name: "Analog Classic Watch",
    category: "Watches",
    images: [
      fill("samples/ecommerce/analog-classic"),
      detail("samples/ecommerce/analog-classic", "center", 0.5),
    ],
    description:
      "A steel field watch on a tan leather strap, with a domed sapphire crystal.",
    features: ["Water resistant to 50 m", "Sapphire crystal", "Swiss quartz"],
    variants: single(24900, 3, { offer_price: 19900 }),
  },
  {
    name: "Rose Aviator Sunglasses",
    category: "Eyewear",
    images: [pad("sunglasses")],
    description:
      "Feather-light titanium aviators with rose mirrored UV400 lenses.",
    features: ["Titanium frame", "UV400 lenses", "Case included"],
    variants: single(3900, 20, { properties: [color("Rose")] }),
  },
  {
    name: "Star Drop Earrings",
    category: "Jewellery",
    images: [pad("earrings"), detail("earrings", "north", 0.5)],
    description:
      "Pavé star drops in sterling silver, set with hand-cut crystals.",
    features: ["Sterling silver", "Hand-set crystals", "Gift boxed"],
    variants: single(5400, 15, { properties: [color("Silver")] }),
  },
  {
    name: "Leather Bifold Wallet",
    category: "Accessories", // directly on a root category
    images: [fill("wallet"), detail("wallet", "east", 0.5)],
    description:
      "A slim bifold in vegetable-tanned leather with contrast stitching.",
    features: ["Vegetable-tanned leather", "Six card slots"],
    variants: single(4900, 25),
  },
  // Home
  {
    name: "Orange Lounge Chair",
    category: "Furniture",
    images: [pad("chair")],
    description:
      "A mid-century lounge chair upholstered in a warm orange wool.",
    features: ["Solid walnut legs", "Wool upholstery"],
    variants: single(32900, 2),
  },
  {
    name: "Mustard Armchair",
    category: "Furniture",
    images: [
      fill("samples/chair-and-coffee-table"),
      detail("samples/chair-and-coffee-table", "east", 0.55),
    ],
    description:
      "A deep, rounded armchair in mustard bouclé. Pairs with our oak side table.",
    features: ["Bouclé upholstery", "Kiln-dried oak frame"],
    is_featured: true,
    variants: single(45900, 3, { offer_price: 39900 }),
  },
  {
    name: "Espresso Cup Set",
    category: "Kitchen",
    images: [fill("coffee")],
    description:
      "Four porcelain espresso cups with saucers, glazed in warm white.",
    features: ["Set of four", "Dishwasher safe"],
    variants: single(2400, 40),
  },
  {
    name: "Pour-Over Coffee Set",
    category: "Kitchen",
    images: [fill("samples/coffee"), detail("samples/coffee", "center", 0.5)],
    description:
      "A borosilicate pour-over carafe with a gooseneck kettle, for a slow morning brew.",
    features: ["Borosilicate glass", "Stainless kettle", "Serves four"],
    variants: single(8400, 12),
  },
  {
    name: "Stoneware Mug",
    category: "Kitchen",
    images: [
      fill("samples/cup-on-a-table"),
      detail("samples/cup-on-a-table", "center", 0.45),
    ],
    description: "A wheel-thrown stoneware mug in a matte chalk glaze.",
    features: ["Holds 350 ml", "Microwave safe"],
    variants: single(2200, 60),
  },
  {
    name: "Cobalt Glass Decanter",
    category: "Decor",
    images: [fill("bottle"), detail("bottle", "north", 0.5)],
    description: "Mouth-blown cobalt glass with a faceted stopper.",
    features: ["Mouth-blown glass", "Holds 750 ml"],
    variants: single(6400, 7),
  },
  {
    // Its default variant is inactive, so the product is hidden too.
    name: "City Bike",
    category: "Home",
    images: [fill("bike")],
    description: "Default variant inactive: hidden from the storefront.",
    variants: [
      { selling_price: 45900, stock: 1, is_default: true, is_active: false },
    ],
  },
  // Audio
  {
    name: "Studio Wireless Headphones",
    category: "Audio",
    images: [pad("docs/headphones"), detail("docs/headphones", "west", 0.55)],
    description:
      "Closed-back wireless headphones with 40-hour battery life and memory-foam cushions.",
    features: ["40-hour battery", "Active noise cancelling", "USB-C charging"],
    is_featured: true,
    variants: single(19900, 10, { properties: [color("White")] }),
  },
];

const url = (spec: string) => `${IMG}/${spec}.jpg`;
// The helpers' transformation segments all contain a comma; public IDs don't.
const publicId = (spec: string) =>
  spec
    .split("/")
    .filter((segment) => !segment.includes(","))
    .join("/");

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
        images: p.images.map(url),
        image_public_ids: p.images.map(publicId),
        is_active: p.is_active ?? true,
        is_featured: p.is_featured ?? false,
      },
    });
    if (!data) fail(`create product ${p.name}`, error);

    for (const { images = p.images.slice(0, 1), ...variant } of p.variants) {
      const { error: variantError } = await adminCreateVariant({
        client,
        path: { productID: data.data.id },
        body: {
          ...variant,
          images: images.map(url),
          image_public_ids: images.map(publicId),
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
