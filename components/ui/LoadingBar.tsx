'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function LoadingBar() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const handleStart = () => {
            setLoading(true);
            setProgress(10);

            // Fast progress to 70%
            const fastTimer = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 70) {
                        clearInterval(fastTimer);
                        return 70;
                    }
                    return prev + 15;
                });
            }, 100);

            // Slower progress to 95%
            const slowTimer = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 95) {
                        clearInterval(slowTimer);
                        return 95;
                    }
                    return prev + 0.5;
                });
            }, 500);

            return () => {
                clearInterval(fastTimer);
                clearInterval(slowTimer);
            };
        };

        const handleComplete = () => {
            setProgress(100);
            setTimeout(() => {
                setLoading(false);
                setProgress(0);
            }, 400);
        };

        handleStart();
        const timeout = setTimeout(handleComplete, 800); // Artificial delay to ensure it's visible

        return () => clearTimeout(timeout);
    }, [pathname, searchParams]);

    if (!loading) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-[100] h-[4px] pointer-events-none">
            <div
                className="h-full bg-gradient-to-r from-teal-400 via-primary-500 to-teal-400 bg-[length:200%_auto] animate-shimmer transition-all duration-300 ease-out shadow-[0_0_20px_rgba(20,184,166,0.8)]"
                style={{ width: `${progress}%` }}
            />
            {/* Pulsing Tip Glow */}
            <div
                className="absolute top-0 h-full w-32 blur-xl bg-white/60 transition-all duration-300 ease-out"
                style={{ left: `calc(${progress}% - 32px)`, opacity: progress > 0 ? 1 : 0 }}
            />
        </div>
    );
}
