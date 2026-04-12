/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/play/pattern_detective/size_sorting',
        destination: '/play/pattern_detective/size_color_sorting',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
