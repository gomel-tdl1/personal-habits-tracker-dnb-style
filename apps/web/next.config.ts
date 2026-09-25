import type { NextConfig } from "next";

// `DROP_TARGET=mobile` builds static files for the iOS app (apps/mobile).
const mobile = process.env.DROP_TARGET === "mobile";

const nextConfig: NextConfig = {
  transpilePackages: ["@drop/core"],
  ...(mobile && { output: "export" }),
};

export default nextConfig;
