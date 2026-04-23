import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,

  // FIXED
  outputFileTracingRoot: path.resolve(__dirname),
};

export default nextConfig;