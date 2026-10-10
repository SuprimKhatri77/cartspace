import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev container builds into its own directory: its volume mountpoint
  // is created by Docker as root, which would block host builds of .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
