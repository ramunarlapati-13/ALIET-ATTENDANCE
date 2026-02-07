/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'export',
    basePath: '/ALIET-ATTENDANCE',
    images: {
        unoptimized: true,
        domains: ['firebasestorage.googleapis.com'],
    },
};

export default nextConfig;
