import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev container builds into its own directory: its volume mountpoint
  // is created by Docker as root, which would block host builds of .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: {
    // Product images are Cloudinary uploads, resized and converted by
    // Cloudinary itself (lib/image-loader.ts), so Next's optimizer is unused.
    loader: "custom",
    loaderFile: "./lib/image-loader.ts",
  },
};

export default nextConfig;
