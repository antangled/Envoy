import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite", "linkedom"],
  // The route indicator covers the bottom-left action bars; compile and runtime errors still show.
  devIndicators: false,
  turbopack: {
    rules: {
      "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" },
    },
  },
  // Migrations are read from disk at runtime; include them in the serverless bundle.
  outputFileTracingIncludes: { "/api/**/*": ["./drizzle/**/*"] },
};

export default nextConfig;
