/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'd11fi0esezlwk0.cloudfront.net',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/website',
        destination: '/',
        permanent: true,
      },
      {
        source: '/website/:path*',
        destination: '/:path*',
        permanent: true,
      },
    ];
  },
  experimental: {
    proxyClientMaxBodySize: '50mb',
  },
};

export default nextConfig;
