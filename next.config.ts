import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config, { isServer }) => {
    // Use the browser field in package.json for client-side builds
    if (!isServer) {
      config.resolve.aliasFields = [...(config.resolve.aliasFields || []), 'browser'];
    }
    return config;
  },
};

export default nextConfig;
