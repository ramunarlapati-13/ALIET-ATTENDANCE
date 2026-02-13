'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Announcement } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { Megaphone } from 'lucide-react';

export default function AnnouncementTicker() {
    const { currentUser } = useAuth();
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);

    useEffect(() => {
        // Subscribe to all active announcements
        const q = query(
            collection(db, 'announcements'),
            where('isActive', '==', true)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const allAnnouncements = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Announcement[];

            // Sort on client to avoid null timestamp issues with serverTimestamp
            const sorted = allAnnouncements.sort((a, b) => {
                const timeA = a.createdAt?.toMillis() || Date.now();
                const timeB = b.createdAt?.toMillis() || Date.now();
                return timeB - timeA;
            });

            // Filter by audience and department
            const filtered = sorted.filter(ann => {
                // Administrators see everything
                if (currentUser?.role === 'admin') return true;

                // If it's for everyone
                if (!ann.audience || ann.audience === 'all') return true;

                // Match by user role
                if (currentUser?.role === ann.audience) {
                    // If it's departmental, also check department
                    if (ann.tier === 'departmental') {
                        return currentUser?.department === ann.department;
                    }
                    return true;
                }

                return false;
            });

            setAnnouncements(filtered);
        });

        return () => unsubscribe();
    }, [currentUser]);

    if (announcements.length === 0) {
        return null;
    }

    return (
        <div className="bg-primary-600 dark:bg-primary-900 overflow-hidden border-b border-primary-500/30">
            <div className="max-w-7xl mx-auto flex items-center h-10 px-4">
                <div className="flex items-center gap-2 bg-primary-700 dark:bg-primary-800 px-3 py-1 rounded-l-md z-10 shadow-lg">
                    <Megaphone className="w-4 h-4 text-white animate-bounce" />
                    <span className="text-[10px] font-bold text-white uppercase tracking-tighter">Updates</span>
                </div>

                <div className="ticker flex-1 relative h-full flex items-center">
                    <div className="ticker-content py-2">
                        {announcements.map((announcement, index) => (
                            <span key={announcement.id} className="inline-flex items-center">
                                <span className="text-sm font-bold text-white uppercase mx-2 px-1.5 py-0.5 bg-white/10 rounded">
                                    {announcement.tier === 'departmental' ? announcement.department : 'Institutional'}
                                </span>
                                <span className="text-sm font-medium text-primary-50 truncate">
                                    {announcement.title}:
                                </span>
                                <span className="text-sm text-white/90 ml-1">
                                    {announcement.content}
                                </span>
                                {index < announcements.length - 1 && (
                                    <span className="mx-12 text-white/30 font-light">||</span>
                                )}
                            </span>
                        ))}
                        {/* Duplicate content for seamless loop if needed, but the Pl-[100%] handles it for short lists */}
                    </div>
                </div>
            </div>
        </div>
    );
}
