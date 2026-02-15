import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
    dest: "public",
    disable: process.env.NODE_ENV === 'development', // Disable in development for speed
    register: true,
    skipWaiting: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
    swcMinify: true,
    images: {
        unoptimized: true,
        domains: ['firebasestorage.googleapis.com'],
    },
    experimental: {
        optimizePackageImports: ['lucide-react', 'recharts', 'date-fns'],
    },
    // SECURITY: Add security headers
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    {
                        key: 'X-DNS-Prefetch-Control',
                        value: 'on'
                    },
                    {
                        key: 'Strict-Transport-Security',
                        value: 'max-age=31536000; includeSubDomains; preload'
                    },
                    {
                        key: 'X-Frame-Options',
                        value: 'SAMEORIGIN'
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff'
                    },
                    {
                        key: 'X-XSS-Protection',
                        value: '1; mode=block'
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin'
                    },
                    {
                        key: 'Permissions-Policy',
                        value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
                    }
                ]
            }
        ];
    }
};

export default withPWA(nextConfig);
