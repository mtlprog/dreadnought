import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  transpilePackages: ["@dreadnought/ui", "@dreadnought/theme", "@dreadnought/utils"],
};

export default nextConfig;
