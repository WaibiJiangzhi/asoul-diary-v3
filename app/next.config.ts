import type { NextConfig } from 'next';

const nextConfig: NextConfig =
  process.env.CF_PAGES === '1'
    ? {
        output: 'export',
      }
    : {};

export default nextConfig;
