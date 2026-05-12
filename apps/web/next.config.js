/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@kostin/types"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
};

module.exports = nextConfig;
