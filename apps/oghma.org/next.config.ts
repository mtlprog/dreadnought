import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Experimental features
  experimental: {
    // Enable React Server Components
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.ytimg.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "img.youtube.com",
        pathname: "/**",
      },
    ],
  },

  // Transpile workspace packages
  transpilePackages: [
    "@dreadnought/ui",
    "@dreadnought/utils",
    "@dreadnought/stellar-core",
  ],
};

export default nextConfig;
