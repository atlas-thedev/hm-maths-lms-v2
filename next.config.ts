import type { NextConfig } from "next";

// The Content-Security-Policy is set per request (with a script nonce) in src/lib/db/middleware.ts.

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg"],
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "img.youtube.com" },
    ],
  },
  experimental: { serverActions: { bodySizeLimit: "2mb" } },
  async rewrites() {
    return [
      { source: "/favicon.ico", destination: "/brand-icon/favicon.ico" },
      { source: "/icon-192.png", destination: "/brand-icon/icon-192.png" },
      { source: "/icon-512.png", destination: "/brand-icon/icon-512.png" },
      { source: "/apple-touch-icon.png", destination: "/brand-icon/apple-touch-icon.png" },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
        ],
      },
      {
        source: "/admin/attendance",
        headers: [
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
