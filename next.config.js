/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Vercel's image optimization has a usage quota; once exceeded, every
    // /_next/image request returns 402. Serve images as-is instead.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      // Fallback so a stray http:// image URL renders instead of crashing the page.
      { protocol: "http", hostname: "**" },
    ],
  },
};

module.exports = nextConfig;
