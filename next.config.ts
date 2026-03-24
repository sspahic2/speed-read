import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.lemonsqueezy.com",
      },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "@radix-ui/react-icons"],
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
