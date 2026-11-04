import type { NextConfig } from "next";

// MODO PANTULAN — ekspor statis 1:1 UI otak untuk hidup mandiri di GitHub Pages.
// Semua URL aset memakai basis /Rantaian sesuai alamat repo.
const nextConfig: NextConfig = {
  output: "export",
  basePath: "/Rantaian",
  assetPrefix: "/Rantaian",
  trailingSlash: true,
  images: { unoptimized: true },
  typescript: { ignoreBuildErrors: true },
  reactStrictMode: false,
};

export default nextConfig;
