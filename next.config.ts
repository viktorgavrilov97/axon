import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    localPatterns: [
      { pathname: "/uploads/**" },
      { pathname: "/networks/**" },
      { pathname: "/strategies/**" },
      { pathname: "/**" },
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "img.youtube.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "ax.fund",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "axon.mlmos1.club",
        pathname: "/uploads/**",
      },
    ],
  },
};

export default nextConfig;

