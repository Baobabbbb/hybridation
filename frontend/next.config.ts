import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Image configuration for external images
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
