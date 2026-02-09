'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardRedirect() {
    const { currentUser, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && currentUser) {
            const role = currentUser.role;
            if (role === 'hod') {
                router.push('/dashboard/faculty');
            } else {
                router.push(`/dashboard/${role}`);
            }
        } else if (!loading && !currentUser) {
            router.push('/login');
        }
    }, [currentUser, loading, router]);

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
    );
}
