/** @type {import('next').NextConfig} */
const nextConfig = {
  // Login sekarang pakai Google (Portal Staff); halaman password lama diarahkan ke login.
  async redirects() {
    return [
      { source: "/lupa-password", destination: "/", permanent: false },
      { source: "/reset", destination: "/", permanent: false },
    ];
  },
};
module.exports = nextConfig;
