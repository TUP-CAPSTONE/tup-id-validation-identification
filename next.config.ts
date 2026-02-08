import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        port: '',
        pathname: '/tup-id-verification.firebasestorage.app/**',
      },
    ],
  },
};

export default nextConfig;
