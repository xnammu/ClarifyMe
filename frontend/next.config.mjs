/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // Optional convenience: lets the frontend call /outputs/... directly in dev
    // without CORS if you'd rather proxy than hit the API origin from the browser.
    // Not required - lib/api.ts talks to NEXT_PUBLIC_API_BASE directly by default.
    return [];
  },
};

export default nextConfig;
