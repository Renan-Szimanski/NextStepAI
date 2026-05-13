/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ['@langchain/core', 'lucide-react', 'date-fns'],
  },
  images: {
    domains: ['avatars.githubusercontent.com'],
  },
};

export default nextConfig;