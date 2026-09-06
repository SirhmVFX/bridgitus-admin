import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep native/heavy packages out of the serverless bundle
  serverExternalPackages: ["firebase-admin", "unpdf"],
};

export default nextConfig;
