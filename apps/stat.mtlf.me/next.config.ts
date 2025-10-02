import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: false,
    dirs: ["app", "src/components", "src/hooks", "src/lib"], // Only lint web app code during Next.js build
  },
};

export default nextConfig;
