import type { NextConfig } from "next";

const allowedOrigins = process.env.ALLOWED_DEV_ORIGINS 
    ? process.env.ALLOWED_DEV_ORIGINS.split(",") 
    : [];

const nextConfig: NextConfig = {
  allowedDevOrigins: [...allowedOrigins, "localhost", "127.0.0.1"],
};

export default nextConfig;
