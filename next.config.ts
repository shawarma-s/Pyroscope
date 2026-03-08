import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow server-side fetches to external APIs without caching issues
  serverExternalPackages: ["backboard-sdk"],
  devIndicators: false,
};

export default nextConfig;
