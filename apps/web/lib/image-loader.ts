import type { ImageLoaderProps } from "next/image";

// next/image loader for Cloudinary (next.config.ts: images.loaderFile).
// Cloudinary resizes and picks the format (AVIF/WebP) at its edge, so Next's
// own optimizer is skipped. Transformations already in the URL (crops from
// the catalog) run first; the resize is appended after them.

const UPLOAD = "/image/upload/";

// Cloudinary transformation parameter keys, used to tell a transformation
// segment ("c_fill,g_auto") from a public ID folder.
const PARAMS = new Set([
  "a",
  "ar",
  "b",
  "bo",
  "c",
  "co",
  "dpr",
  "e",
  "f",
  "fl",
  "g",
  "h",
  "l",
  "o",
  "q",
  "r",
  "t",
  "u",
  "w",
  "x",
  "y",
  "z",
]);

function isTransformation(segment: string): boolean {
  return segment.split(",").every((part) => {
    const key = part.split("_", 1)[0] ?? "";
    return part.includes("_") && PARAMS.has(key);
  });
}

export default function cloudinaryLoader({
  src,
  width,
  quality,
}: ImageLoaderProps): string {
  const at = src.indexOf(UPLOAD);
  if (!src.startsWith("https://res.cloudinary.com/") || at === -1) return src;

  const head = src.slice(0, at + UPLOAD.length);
  const segments = src.slice(at + UPLOAD.length).split("/");
  let split = 0;
  while (split < segments.length - 1 && isTransformation(segments[split]!)) {
    split++;
  }

  // c_limit never upscales a small original.
  const resize = `f_auto,q_${quality ?? "auto"},c_limit,w_${width}`;
  return (
    head +
    [...segments.slice(0, split), resize, ...segments.slice(split)].join("/")
  );
}
