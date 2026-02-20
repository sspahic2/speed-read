import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react", "@radix-ui/react-icons"],
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
