'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Announcement } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { Megaphone } from 'lucide-react';

export default function AnnouncementTicker() {
    const { currentUser } = useAuth();
    const [institutionalAnnouncements, setInstitutionalAnnouncements] = useState<Announcement[]>([]);
    const [departmentalAnnouncements, setDepartmentalAnnouncements] = useState<Announcement[]>([]);

    useEffect(() => {
        // Subscribe to institutional announcements
        const institutionalQuery = query(
            collection(db, 'announcements'),
            where('tier', '==', 'institutional'),
            where('isActive', '==', true),
            orderBy('createdAt', 'desc')
        );

        const unsubInstitutional = onSnapshot(institutionalQuery, (snapshot) => {
            const announcements = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Announcement[];
            setInstitutionalAnnouncements(announcements);
        });

        // Subscribe to departmental announcements if user has a department
        let unsubDepartmental = () => { };
        if (currentUser?.department) {
            const departmentalQuery = query(
                collection(db, 'announcements'),
                where('tier', '==', 'departmental'),
                where('department', '==', currentUser.department),
                where('isActive', '==', true),
                orderBy('createdAt', 'desc')
            );

            unsubDepartmental = onSnapshot(departmentalQuery, (snapshot) => {
                const announcements = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Announcement[];
                setDepartmentalAnnouncements(announcements);
            });
        }

        return () => {
            unsubInstitutional();
            unsubDepartmental();
        };
    }, [currentUser]);

    if (institutionalAnnouncements.length === 0 && departmentalAnnouncements.length === 0) {
        return null;
    }

    return (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm transition-colors">
            {/* Institutional Announcements */}
            {institutionalAnnouncements.length > 0 && (
                <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white py-2 px-4">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <Megaphone className="w-4 h-4" />
                            <span className="text-sm font-semibold">Institutional:</span>
                        </div>
                        <div className="ticker flex-1">
                            <div className="ticker-content">
                                {institutionalAnnouncements.map((announcement, index) => (
                                    <span key={announcement.id} className="inline-block">
                                        <span className="font-medium">{announcement.title}</span>
                                        {' - '}
                                        <span>{announcement.content}</span>
                                        {index < institutionalAnnouncements.length - 1 && (
                                            <span className="mx-8">•</span>
                                        )}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Departmental Announcements */}
            {departmentalAnnouncements.length > 0 && (
                <div className="bg-gradient-to-r from-secondary-600 to-secondary-700 text-white py-2 px-4">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <Megaphone className="w-4 h-4" />
                            <span className="text-sm font-semibold">Department:</span>
                        </div>
                        <div className="ticker flex-1">
                            <div className="ticker-content">
                                {departmentalAnnouncements.map((announcement, index) => (
                                    <span key={announcement.id} className="inline-block">
                                        <span className="font-medium">{announcement.title}</span>
                                        {' - '}
                                        <span>{announcement.content}</span>
                                        {index < departmentalAnnouncements.length - 1 && (
                                            <span className="mx-8">•</span>
                                        )}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
