/** @type {import('next').NextConfig} */
const nextConfig = {
  // Hide the Next.js dev-mode floating "N" indicator (bottom-right artifact)
  devIndicator: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
