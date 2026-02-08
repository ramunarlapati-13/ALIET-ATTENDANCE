'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
    const { currentUser, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // If loading takes too long, force redirect to login
        const timeoutId = setTimeout(() => {
            if (loading) {
                router.replace('/login');
            }
        }, 5000);

        if (!loading) {
            if (currentUser) {
                // If user is logged in, redirect to their dashboard
                if (currentUser.role === 'student') {
                    router.replace('/dashboard/student');
                } else {
                    router.replace('/dashboard/admin'); // or general dashboard
                }
            } else {
                router.replace('/login');
            }
        }

        return () => clearTimeout(timeoutId);
    }, [currentUser, loading, router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 to-secondary-600">
            <div className="text-white text-center">
                <h1 className="text-4xl font-bold mb-4">ALIETAKE</h1>
                <p className="text-xl">
                    {loading ? 'Initializing...' : 'Redirecting...'}
                </p>
            </div>
        </div>
    );
}
