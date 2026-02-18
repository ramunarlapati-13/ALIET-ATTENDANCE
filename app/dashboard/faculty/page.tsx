'use client';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import {
    User,
    BarChart3,
    Presentation,
    LogOut,
    Users,
    X,
    CheckCircle,
    Clock,
    Calendar as CalendarIcon,
    ClipboardCheck,
    BookOpen,
    FileSpreadsheet
} from 'lucide-react';
import studentData from '@/data/students.json';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { Component as PencilLoader } from '@/components/ui/loader-1';
import {
    db,
    collection,
    query,
    where,
    getDocs,
    limit,
    orderBy,
    onSnapshot
} from '@/lib/firebase/config';
import { useState, useEffect } from 'react';
import ThemeToggleFloating from '@/components/ui/ThemeToggleFloating';
import AnnouncementTicker from '@/components/announcements/AnnouncementTicker';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export default function FacultyDashboard() {
    const { currentUser, loading, signOut } = useAuth();
    const router = useRouter();
    const { requestPermission, permission, isSupported } = usePushNotifications();
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);

    // Fetch Notifications (Announcements)
    const [notifications, setNotifications] = useState<any[]>([]);

    useEffect(() => {
        if (!currentUser) return;



        const q = query(
            collection(db, 'announcements'),
            where('isActive', '==', true),
            orderBy('createdAt', 'desc'),
            limit(10)
        );

        const unsubscribe = onSnapshot(q, (snapshot: any) => {
            const allAnn = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

            // Client-side Filtering
            const filtered = allAnn.filter((ann: any) => {
                if (currentUser.role === 'admin') return true;
                if (!ann.audience || ann.audience === 'all') return true;
                if (currentUser.role === ann.audience) {
                    if (ann.tier === 'departmental') {
                        return currentUser.department === ann.department;
                    }
                    return true;
                }
                return false;
            });

            setNotifications(filtered);
        });

        return () => unsubscribe();
    }, [currentUser]);

    const handleLogout = async () => {
        if (confirm('Are you sure you want to logout?')) {
            await signOut();
            router.push('/login');
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
            <div className="flex flex-col items-center gap-4">
                <PencilLoader scale={1.2} />
                <p className="text-gray-500 animate-pulse font-medium">Loading Dashboard...</p>
            </div>
        </div>
    );

    return (
        <ProtectedRoute allowedRoles={['faculty', 'hod', 'admin']}>
            {currentUser && (
                <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
                    <AnnouncementTicker />
                    <ThemeToggleFloating />
                    {/* Header/Navigation */}
                    <div className="max-w-7xl mx-auto space-y-6 p-8">
                        {/* Header with Logout */}
                        <div className="flex items-center justify-between">
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                                {currentUser.role === 'hod' ? 'HOD Dashboard' : 'Faculty Dashboard'}
                            </h1>
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <button
                                        onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors relative"
                                    >
                                        <div className="w-5 h-5 text-gray-600 dark:text-gray-400">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bell"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
                                        </div>
                                        {permission === 'default' && isSupported && (
                                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-gray-800"></span>
                                        )}
                                    </button>

                                    {/* Notification Dropdown */}
                                    {isNotificationOpen && (
                                        <div className="fixed left-4 right-4 top-20 sm:absolute sm:right-0 sm:left-auto sm:top-full sm:mt-2 sm:w-80 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                            <div className="p-3 border-b border-gray-100 dark:border-gray-700 font-semibold text-gray-900 dark:text-white flex justify-between items-center">
                                                <span>Notifications</span>
                                                <button onClick={() => setIsNotificationOpen(false)} className="text-gray-400 hover:text-gray-600">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="p-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                                                {permission === 'default' && isSupported && (
                                                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-center mb-2">
                                                        <div className="mx-auto w-10 h-10 bg-indigo-100 dark:bg-indigo-800 rounded-full flex items-center justify-center mb-2">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-indigo-600 dark:text-indigo-300"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
                                                        </div>
                                                        <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Enable Notifications</p>
                                                        <button
                                                            onClick={() => {
                                                                requestPermission();
                                                                setIsNotificationOpen(false);
                                                            }}
                                                            className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors"
                                                        >
                                                            Turn On
                                                        </button>
                                                    </div>
                                                )}

                                                {notifications.length > 0 ? (
                                                    <div className="space-y-2">
                                                        {notifications.map((notif) => (
                                                            <div key={notif.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                                                <div className="flex justify-between items-start mb-1">
                                                                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${notif.tier === 'institutional' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'}`}>
                                                                        {notif.tier}
                                                                        {notif.department ? ` - ${notif.department}` : ''}
                                                                    </span>
                                                                    <span className="text-[10px] text-gray-400">
                                                                        {notif.createdAt?.toDate ? notif.createdAt.toDate().toLocaleDateString() : 'Just now'}
                                                                    </span>
                                                                </div>
                                                                <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-0.5">{notif.title}</h4>
                                                                <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">{notif.content}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 mb-2 opacity-20"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
                                                        <p className="text-xs">No new notifications</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-sm"
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span className="hidden sm:inline">Logout</span>
                                </button>
                            </div>
                        </div>

                        {/* Profile Card */}
                        <div
                            className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-md transition-all group"
                            onClick={() => router.push('/dashboard/faculty/profile')}
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                                    <User className="w-8 h-8" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{currentUser.name}</h2>
                                    <p className="text-gray-500 dark:text-gray-400 font-medium">{currentUser.employeeId}</p>
                                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{currentUser.department}</p>
                                </div>
                            </div>
                        </div>

                        {/* Actions Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-6">
                                <div>
                                    <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Quick Actions</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Mark Attendance */}
                                        <div
                                            className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-700 transition-all cursor-pointer group"
                                            onClick={() => router.push('/dashboard/faculty/attendance')}
                                        >
                                            <div className="flex items-center gap-4 mb-3">
                                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                    <Presentation className="w-6 h-6" />
                                                </div>
                                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Mark Attendance</h3>
                                            </div>
                                            <p className="text-gray-600 dark:text-gray-400 text-sm">Record daily attendance for your assigned classes.</p>
                                        </div>

                                        {/* Analytics */}
                                        <div
                                            className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-purple-200 dark:hover:border-purple-700 transition-all cursor-pointer group"
                                            onClick={() => router.push('/dashboard/faculty/analytics')}
                                        >
                                            <div className="flex items-center gap-4 mb-3">
                                                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600 dark:text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                                    <BarChart3 className="w-6 h-6" />
                                                </div>
                                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">View Analytics</h3>
                                            </div>
                                            <p className="text-gray-600 dark:text-gray-400 text-sm">Visualize attendance trends and student performance.</p>
                                        </div>

                                        {/* Marks Entry */}
                                        <div
                                            className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-orange-200 dark:hover:border-orange-700 transition-all cursor-pointer group"
                                            onClick={() => router.push('/dashboard/faculty/marks')}
                                        >
                                            <div className="flex items-center gap-4 mb-3">
                                                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-orange-600 dark:text-orange-400 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                                                    <ClipboardCheck className="w-6 h-6" />
                                                </div>
                                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Enter Marks</h3>
                                            </div>
                                            <p className="text-gray-600 dark:text-gray-400 text-sm">Record marks for assignments, mid-exams, and more.</p>
                                        </div>

                                        {/* Manage Subjects */}
                                        <div
                                            className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-teal-200 dark:hover:border-teal-700 transition-all cursor-pointer group"
                                            onClick={() => router.push('/dashboard/manage-subjects')}
                                        >
                                            <div className="flex items-center gap-4 mb-3">
                                                <div className="p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg text-teal-600 dark:text-teal-400 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                                                    <BookOpen className="w-6 h-6" />
                                                </div>
                                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Manage Subjects</h3>
                                            </div>
                                            <p className="text-gray-600 dark:text-gray-400 text-sm">Configure syllabus and assign faculty to subjects.</p>
                                        </div>

                                        {/* Generate Reports */}
                                        <div
                                            className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-green-200 dark:hover:border-green-700 transition-all cursor-pointer group"
                                            onClick={() => router.push('/dashboard/faculty/reports')}
                                        >
                                            <div className="flex items-center gap-4 mb-3">
                                                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-600 dark:text-green-400 group-hover:bg-green-600 group-hover:text-white transition-colors">
                                                    <FileSpreadsheet className="w-6 h-6" />
                                                </div>
                                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Generate Reports</h3>
                                            </div>
                                            <p className="text-gray-600 dark:text-gray-400 text-sm">Download consolidated attendance sheets (CC/CA).</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Recent Attendance Sidebar */}
                            <div className="lg:col-span-1">
                                <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">
                                    {currentUser.role === 'hod' ? 'Department Attendance' : 'My Recent Attendance'}
                                </h2>
                                <RecentAttendanceList currentUser={currentUser} />
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <ThemeToggleFloating />
        </ProtectedRoute>
    );
}



function RecentAttendanceList({ currentUser }: { currentUser: any }) {
    const router = useRouter();
    const [recentAttendance, setRecentAttendance] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRecord, setSelectedRecord] = useState<any>(null);

    useEffect(() => {
        const fetchRecent = async () => {
            try {
                // Fetch recent attendance
                // For HOD: filter by branch
                // For Faculty: filter by facultyId
                const q = currentUser.role === 'hod'
                    ? query(collection(db, 'attendance'), where('branch', '==', currentUser.department), limit(5))
                    : query(collection(db, 'attendance'), where('facultyId', '==', currentUser.uid), limit(5));

                const snapshot = await getDocs(q);
                const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                    .sort((a: any, b: any) => {
                        const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
                        const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
                        return timeB - timeA;
                    });

                setRecentAttendance(docs);
            } catch (err) {
                console.error("Error fetching recent attendance:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchRecent();
    }, [currentUser]);

    if (loading) return <div className="text-gray-500 text-sm italic">Loading recent records...</div>;
    if (recentAttendance.length === 0) return <div className="text-gray-400 text-sm py-4 bg-gray-50 rounded-lg text-center">No recent records found</div>;

    const absentees = selectedRecord ? Object.entries(selectedRecord.records || {})
        .filter(([_, status]) => status === 'Absent')
        .map(([regNo]) => ({
            regNo,
            name: (studentData as Record<string, string>)[regNo] || 'Unknown Student'
        })) : [];

    return (
        <div className="space-y-3">
            {recentAttendance.map((record) => (
                <div
                    key={record.id}
                    className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group relative"
                    onClick={() => setSelectedRecord(record)}
                >
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">
                            {record.branch} - {record.year}Y {record.section}
                        </span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {record.timestamp?.toDate ? record.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CalendarIcon className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                            <span className="text-xs text-gray-600 dark:text-gray-300">{record.date}</span>
                        </div>
                        <div className="text-xs">
                            <span className="text-green-600 dark:text-green-400 font-semibold">{record.stats?.present}</span>
                            <span className="text-gray-400 mx-1">/</span>
                            <span className="text-gray-600 dark:text-gray-300">{record.stats?.total}</span>
                        </div>
                    </div>
                    {currentUser.role === 'hod' && (
                        <p className="text-[10px] text-gray-400 mt-1 border-t dark:border-gray-700 pt-1">
                            By: {record.facultyName || 'Unknown'}
                        </p>
                    )}
                    <div className="absolute right-2 bottom-2 rotate-0 group-hover:rotate-6 opacity-0 group-hover:opacity-100 transition-all">
                        <span className="text-[10px] text-blue-500 font-medium flex items-center gap-0.5">
                            View Absentees <Users className="w-2.5 h-2.5" />
                        </span>
                    </div>
                </div>
            ))}
            <button
                onClick={() => router.push('/dashboard/faculty/attendance')}
                className="w-full text-center text-xs text-blue-600 hover:text-blue-700 font-medium py-2"
            >
                View All Records
            </button>

            {/* Absentees Modal */}
            {selectedRecord && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div>
                                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                    <Users className="w-5 h-5 text-red-500" />
                                    Absentees List
                                </h3>
                                <p className="text-xs text-gray-500 mt-1">
                                    {selectedRecord.branch} {selectedRecord.year}Y {selectedRecord.section} | {selectedRecord.date}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedRecord(null)}
                                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="max-h-[60vh] overflow-y-auto p-4">
                            {absentees.length > 0 ? (
                                <div className="space-y-2">
                                    {absentees.map((s, idx) => (
                                        <div key={s.regNo} className="flex items-center justify-between p-3 bg-red-50/30 rounded-xl border border-red-100/50">
                                            <div className="flex items-center gap-3">
                                                <span className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-[10px] font-bold">
                                                    {idx + 1}
                                                </span>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">{s.name}</p>
                                                    <p className="text-[10px] text-gray-500 font-mono uppercase">{s.regNo}</p>
                                                </div>
                                            </div>
                                            <div className="px-2 py-1 bg-red-100 text-red-700 text-[10px] font-bold rounded uppercase">
                                                Absent
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-8 text-center bg-green-50 rounded-xl border border-green-100">
                                    <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                                    <p className="font-bold text-green-700">100% Attendance!</p>
                                    <p className="text-xs text-green-600">No students were absent for this class.</p>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
                            <span>Total Absentees: <b className="text-red-600">{absentees.length}</b></span>
                            <button
                                onClick={() => setSelectedRecord(null)}
                                className="px-4 py-2 bg-gray-900 text-white rounded-lg font-bold hover:bg-gray-800 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
