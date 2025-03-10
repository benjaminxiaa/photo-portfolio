// import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["r2.your-cloudflare-account.workers.dev"],
    // Add this to allow Image component to work with R2 URLs
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.workers.dev",
        pathname: "/static/**",
      },
    ],
  },
  // Enable the Edge runtime
  experimental: {
    runtime: "edge",
  },
};

module.exports = nextConfig;
