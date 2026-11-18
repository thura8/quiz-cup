import type { NextConfig } from "next";

const ARENA_ASSET_CACHE = "public, max-age=86400, stale-while-revalidate=604800";

const nextConfig: NextConfig = {
  async headers() {
    if (process.env.NODE_ENV !== "production") return [];
    return [
      {
        source: "/quiz-cup/arena/:path*",
        headers: [{ key: "Cache-Control", value: ARENA_ASSET_CACHE }],
      },
    ];
  },
};

export default nextConfig;
