'use client';

import React from 'react';

interface SkeletonProps {
    className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
    return (
        <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />
    );
}

export function DashboardSkeleton() {
    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-10 w-24" />
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-4">
                    <Skeleton className="w-16 h-16 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="space-y-4">
                        <Skeleton className="h-8 w-40" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Skeleton className="h-32 rounded-xl" />
                            <Skeleton className="h-32 rounded-xl" />
                        </div>
                    </div>
                </div>
                <div className="lg:col-span-1 space-y-4">
                    <Skeleton className="h-8 w-40" />
                    <Skeleton className="h-[400px] rounded-xl" />
                </div>
            </div>
        </div>
    );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number, cols?: number }) {
    return (
        <div className="w-full space-y-4">
            <div className="flex justify-between mb-4">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-10 w-32" />
            </div>
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 border-b border-gray-200 dark:border-gray-700 flex gap-4">
                    {Array.from({ length: cols }).map((_, i) => (
                        <Skeleton key={i} className="h-4 flex-1" />
                    ))}
                </div>
                <div className="p-4 space-y-4">
                    {Array.from({ length: rows }).map((_, i) => (
                        <div key={i} className="flex gap-4">
                            {Array.from({ length: cols }).map((_, j) => (
                                <Skeleton key={j} className="h-8 flex-1" />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export function AnalyticsSkeleton() {
    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <Skeleton className="h-10 w-48" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Skeleton className="h-32 rounded-xl" />
                <Skeleton className="h-32 rounded-xl" />
                <Skeleton className="h-32 rounded-xl" />
                <Skeleton className="h-32 rounded-xl" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Skeleton className="h-[400px] rounded-xl" />
                <Skeleton className="h-[400px] rounded-xl" />
            </div>
        </div>
    );
}
