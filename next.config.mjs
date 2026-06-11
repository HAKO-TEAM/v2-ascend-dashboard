/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/cockpit',
        destination: '/cockpit.html',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
