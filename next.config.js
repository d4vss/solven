/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ['ts', 'tsx', 'md', 'mdx'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'solven.f00635f6adb105bd0d9cffa3a60b9254.r2.cloudflarestorage.com',
        pathname: '/**',
      }
    ],
  },
  redirects: async () => {
    return [
      // Discord redirect
      {
        source: '/discord',
        destination: process.env.DISCORD_INVITE_URL || 'https://discord.gg/solven',
        statusCode: 302,
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
