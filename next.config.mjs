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
};

export default withPWA(nextConfig);
