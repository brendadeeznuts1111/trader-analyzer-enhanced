import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['ccxt'],
  output: 'standalone',
};

export default nextConfig;
