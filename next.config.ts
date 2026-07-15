import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  devIndicators: {
    buildActivity: false,
    appIsrStatus: false,
  },
  experimental: {
    devOverlay: false,
  },
  allowedDevOrigins: ["*.space-z.ai", "*.chatglm.cn"],
  watchOptions: {
    ignored: ['**/db/**', '**/uploads/**', '**/dev.log', '**/server.log', '**/cipherchat-data/**'],
  },
  // Force env vars to be available server-side
  env: {
    DATABASE_URL: process.env.DATABASE_URL || "file:/tmp/cipherchat.db",
    SESSION_SECRET: process.env.SESSION_SECRET || "dev-secret-change-me",
  },
};

export default nextConfig;
