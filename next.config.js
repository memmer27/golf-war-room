/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Force Next to build as a normal server-rendered app (not static export)
  output: "standalone",
};

export default nextConfig;
