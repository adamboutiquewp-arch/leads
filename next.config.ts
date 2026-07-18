import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/campaigns/generate": ["./src/assets/fonts/**"],
  },
};

export default nextConfig;
