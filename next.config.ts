import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config, { isServer }) => {
    // Prefer "browser" entries
    config.resolve.mainFields = ["browser", "module", "main"];
    // Don’t try to polyfill Node builtins in the client bundle
    if (!isServer) {
      config.resolve.fallback = { fs: false, path: false, os: false, crypto: false };
    }
    // Make conditional-exports resolution happier
    config.resolve.conditionNames = ["import", "module", "browser", "default"];

    // Use the browser field in package.json for client-side builds
    if (!isServer) {
      config.resolve.aliasFields = [
        ...(config.resolve.aliasFields || []),
        "browser",
      ];
    }

    return config;
  },
  images: {
    // Allow remove images, i.e. from nostr
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
