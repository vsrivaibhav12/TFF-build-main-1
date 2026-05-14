/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
      // Allow the preview domain (request goes through K8s ingress + FastAPI proxy on 8001 -> 3000)
      allowedOrigins: [
        'localhost:3000',
        '127.0.0.1:3000',
        '127.0.0.1:8001',
        'business-lens-6.preview.emergentagent.com',
        '*.preview.emergentagent.com',
        '*.preview.emergentcf.cloud',
        '*.emergentcf.cloud',
        '*.emergentagent.com',
        'portal.fiscalfulcrum.in',
        'fiscalfulcrum.in',
      ],
      allowedForwardedHosts: [
        'localhost:3000',
        '127.0.0.1:3000',
        '127.0.0.1:8001',
        'business-lens-6.preview.emergentagent.com',
        '*.preview.emergentagent.com',
        '*.preview.emergentcf.cloud',
        '*.emergentcf.cloud',
        '*.emergentagent.com',
        'portal.fiscalfulcrum.in',
        'fiscalfulcrum.in',
      ],
    },
  },
};
module.exports = nextConfig;
