import type { NextConfig } from "next";

const nextConfig: any = {
  cacheComponents: true,
  partialPrefetching: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;