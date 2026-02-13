'use client';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AnnouncementTicker from '@/components/announcements/AnnouncementTicker';
import { useAuth } from '@/context/AuthContext';
import { useState, useEffect } from 'react';
import ThemeToggleFloating from '@/components/ui/ThemeToggleFloating';
import { useRouter } from 'next/navigation';
import {
    LayoutDashboard,
    Calendar,
    BarChart3,
    DollarSign,
    User,
    LogOut,
    Bell,
    Lock,
} from 'lucide-react';

import { db } from '@/lib/firebase/config';
import { collection, query, where, getDocs, orderBy, limit, onSnapshot } from 'firebase/firestore';

export default function StudentDashboard() {
    const { currentUser, signOut } = useAuth();
    const router = useRouter();
    const [attendanceStats, setAttendanceStats] = useState({ percent: 0, classes: 0, present: 0 });

    const [recentAttendance, setRecentAttendance] = useState<any[]>([]);

    useEffect(() => {
        if (!currentUser?.branch || !currentUser?.registrationNumber) return;

        const regNo = currentUser.registrationNumber;

        // Query attendance records for this student's class
        const constraints = [
            where('branch', '==', currentUser.branch),
            where('year', '==', currentUser.year)
        ];

        if (currentUser.section) {
            constraints.push(where('section', '==', currentUser.section));
        }

        const q = query(
            collection(db, 'attendance'),
            ...constraints
            // orderBy('timestamp', 'desc') - Removed to avoid missing index issues
        );

        // Real-time listener
        const unsubscribe = onSnapshot(q, (snapshot) => {
            let total = 0;
            let present = 0;
            const records: any[] = [];

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const studentStatus = data.records?.[regNo!];

                if (studentStatus) {
                    total++;
                    if (studentStatus === 'Present') {
                        present++;
                    }
                    records.push({
                        id: doc.id,
                        ...data,
                        status: studentStatus,
                        formattedDate: data.date,
                        // Handle potential null timestamp during local writes
                        sortTime: data.timestamp ? (data.timestamp.toMillis ? data.timestamp.toMillis() : new Date(data.timestamp).getTime()) : Date.now()
                    });
                }
            });

            // Client-side sorting
            records.sort((a, b) => b.sortTime - a.sortTime);

            setAttendanceStats({
                percent: total > 0 ? Math.round((present / total) * 100) : 0,
                classes: total,
                present: present
            });
            setRecentAttendance(records.slice(0, 5)); // Keep only recent 5

        }, (error) => {
            console.error("Error listening to attendance:", error);
        });

        return () => unsubscribe();
    }, [currentUser]);


    const handleSignOut = async () => {
        await signOut();
        router.push('/login');
    };

    return (
        <ProtectedRoute allowedRoles={['student']}>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
                <AnnouncementTicker />
                {/* Header */}
                <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                        <div className="flex items-center justify-between">
                            <div
                                className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => router.push('/dashboard/student/profile')}
                            >
                                <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
                                    <User className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">{currentUser?.name}</h1>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{currentUser?.registrationNumber}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                                    <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                </button>
                                <button
                                    onClick={handleSignOut}
                                    className="flex items-center gap-2 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span>Sign Out</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </header>



                {/* Main Content */}
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Security Notice */}


                    {/* Welcome Banner */}
                    <div className="bg-gradient-to-r from-primary-600 to-secondary-600 rounded-lg p-6 mb-8 text-white">
                        <h2 className="text-2xl font-bold mb-2">Welcome back, {currentUser?.name}!</h2>
                        <p className="text-primary-100">
                            {currentUser?.branch} - {currentUser?.section} | Year {currentUser?.year}
                        </p>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <div className="card-hover">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                    <Calendar className="w-6 h-6 text-green-600 dark:text-green-400" />
                                </div>
                                <span className="text-2xl font-bold text-green-600 dark:text-green-400">{attendanceStats.percent}%</span>
                            </div>
                            <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium">Attendance</h3>
                            <p className="text-gray-500 dark:text-gray-500 text-xs mt-1">Overall percentage ({attendanceStats.present}/{attendanceStats.classes})</p>
                        </div>

                        <div className="card-hover">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                    <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">78%</span>
                            </div>
                            <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium">Academic Performance</h3>
                            <p className="text-gray-500 dark:text-gray-500 text-xs mt-1">Average marks</p>
                        </div>

                        <div className="card-hover">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                                    <DollarSign className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                                </div>
                                <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">₹5,000</span>
                            </div>
                            <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium">Pending Fees</h3>
                            <p className="text-gray-500 dark:text-gray-500 text-xs mt-1">Due this semester</p>
                        </div>

                        <div className="card-hover">
                            <div className="flex items-center justify-between mb-4">
                                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                    <LayoutDashboard className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                                </div>
                                <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">6</span>
                            </div>
                            <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium">Active Subjects</h3>
                            <p className="text-gray-500 dark:text-gray-500 text-xs mt-1">This semester</p>
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="card">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Attendance</h3>
                            <div className="space-y-3">
                                <div className="space-y-3">
                                    {recentAttendance.length === 0 ? (
                                        <p className="text-sm text-gray-500 italic p-2">No recent attendance records.</p>
                                    ) : (
                                        recentAttendance.map((record, i) => (
                                            <div key={record.id || i} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors px-2 rounded-lg">
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-gray-100">
                                                        {record.topic ? record.topic : 'Regular Class'}
                                                    </p>
                                                    <div className="flex flex-col">
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">{record.formattedDate}</p>
                                                        <p className="text-[10px] text-gray-400">By: {record.facultyName || 'Faculty'}</p>
                                                    </div>
                                                </div>
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${record.status === 'Present'
                                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                    }`}>
                                                    {record.status}
                                                </span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="card">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Announcements</h3>
                            <div className="space-y-3">
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                    <div className="flex items-start gap-2">
                                        <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-1" />
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">Mid-term Exams Schedule</p>
                                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                                Mid-term examinations will be conducted from March 1-10, 2026.
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">2 hours ago</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                    <div className="flex items-start gap-2">
                                        <Bell className="w-4 h-4 text-green-600 dark:text-green-400 mt-1" />
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">Fee Payment Reminder</p>
                                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                                Semester fees due date is approaching. Please clear pending dues.
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">1 day ago</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>


            <ThemeToggleFloating />
        </ProtectedRoute >
    );
}
