/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@medibooking/ui', '@medibooking/types'],
  reactStrictMode: true,
};

export default nextConfig;

