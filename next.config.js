/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      // Fallback so a stray http:// image URL renders instead of crashing the page.
      { protocol: "http", hostname: "**" },
    ],
  },
};

module.exports = nextConfig;
