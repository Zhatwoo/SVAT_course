import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "firebase-admin",
    "@grpc/grpc-js",
    "google-gax",
    "protobufjs",
  ],
};

export default nextConfig;
