import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep firebase-admin out of the serverless bundle (otherwise import fails on Vercel)
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
