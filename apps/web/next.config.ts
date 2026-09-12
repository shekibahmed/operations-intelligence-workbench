import type { NextConfig } from "next";

const isProductionDeployment = process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https://") ?? false;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Docker/standalone deployment output (see Dockerfile, which sets
  // NEXT_OUTPUT=standalone at build time); plain `next start` and
  // `next dev` are unaffected.
  ...(process.env.NEXT_OUTPUT === "standalone" ? { output: "standalone" as const } : {}),
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // Only meaningful over HTTPS; harmless on local http origins.
          ...(isProductionDeployment
            ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
