// Store-wide copy and editorial imagery in one place, so rebranding or
// swapping the demo photography is a one-file change. Images are Cloudinary
// demo-cloud photos (next.config.ts only allows res.cloudinary.com).

const IMG = "https://res.cloudinary.com/demo/image/upload";

export const site = {
  name: "cartspace",
  tagline: "Made for the way you live",
  description:
    "Timeless, versatile pieces for everyday life: clothing, accessories and homewares, made to last and chosen with care.",
  announcement: [
    "Free shipping on orders over $150",
    "30-day returns, no questions asked",
    "New knitwear has landed",
  ],
  hero: {
    eyebrow: "Autumn / Winter collection",
    title: ["Made for the way", "you live."],
    body: "Considered goods in natural materials, made to last and chosen with care. Fewer, better things.",
    image: `${IMG}/c_fill,g_auto,ar_4:5/samples/two-ladies.jpg`,
    imageAlt: "Two friends laughing in ribbed turtlenecks",
    secondaryImage: `${IMG}/c_fill,g_auto,ar_1:1/samples/chair-and-coffee-table.jpg`,
    secondaryAlt: "A mustard armchair beside an oak side table",
  },
  story: {
    eyebrow: "The edit",
    title: "Packed for two days away.",
    body: "A leather pouch, a canvas tote and the scarf you will reach for every morning. Our weekend edit is built from pieces that work harder than they look.",
    image: `${IMG}/c_fill,g_auto,ar_3:2/samples/ecommerce/accessories-bag.jpg`,
    imageAlt: "A flat lay of a leather pouch, a scarf, a watch and boots",
    href: "/categories/bags",
    cta: "Shop bags",
  },
  values: [
    {
      title: "Free shipping over $150",
      body: "Carbon-neutral delivery in two to four working days.",
    },
    {
      title: "30-day returns",
      body: "Changed your mind? Send it back, on us.",
    },
    {
      title: "Secure checkout",
      body: "Payments handled by Stripe. We never see your card.",
    },
    {
      title: "Made to last",
      body: "Natural materials from makers we know by name.",
    },
  ],
  shippingCopy:
    "Free standard shipping on orders over $150; otherwise a flat $8. Orders ship in two to four working days. Returns are free within 30 days of delivery.",
  authImage: `${IMG}/c_fill,g_auto,ar_3:4/samples/outdoor-woman.jpg`,
  authImageAlt: "A woman in a striped knit by the water",
} as const;
