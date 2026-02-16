'use client';

import { useState, useMemo, useEffect } from 'react';
import studentData from '@/data/students.json';
import { detectBranchInfo } from '@/utils/branchDetector';
import { UserCheck, UserX, Save, Filter, AlertTriangle, X, Edit2, Clock, RefreshCw, Users, CheckCircle } from 'lucide-react';
import { Skeleton, TableSkeleton } from '@/components/ui/Skeleton';

import { useAuth } from '@/context/AuthContext';
import { db, realtimeDb } from '@/lib/firebase/config';
import { doc, setDoc, collection, addDoc, serverTimestamp, getDoc, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { ref, set as setDb } from 'firebase/database';

export default function AttendancePage() {
    const { currentUser } = useAuth();

    // Selection Filters
    const [selectedBranch, setSelectedBranch] = useState(currentUser?.department || 'EEE');
    const [selectedYear, setSelectedYear] = useState(2);
    const [selectedSection, setSelectedSection] = useState('A');

    // Update default branch when currentUser loads
    useEffect(() => {
        if (currentUser?.department) {
            setSelectedBranch(currentUser.department);
        }
    }, [currentUser]);
    const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
    const [topic, setTopic] = useState('');
    const [topic, setTopic] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    // Edit Mode State
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingDocId, setEditingDocId] = useState<string | null>(null);
    const [editingTimestamp, setEditingTimestamp] = useState<any>(null);
    const [recentSubmissions, setRecentSubmissions] = useState<any[]>([]);
    const [showRecentSubmissions, setShowRecentSubmissions] = useState(false);
    const [viewingAbsentees, setViewingAbsentees] = useState<any>(null);
    const [loadingRecent, setLoadingRecent] = useState(false);

    // Modal State
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [unmarkedStudents, setUnmarkedStudents] = useState<typeof filteredStudents>([]);

    // Attendance State
    const [attendance, setAttendance] = useState<Record<string, 'Present' | 'Absent'>>({});

    // Load recent submissions on mount
    useEffect(() => {
        if (currentUser) {
            loadRecentSubmissions();
        }
    }, [currentUser]);

    // Check for existing attendance when date or filters change
    useEffect(() => {
        const checkExisting = async () => {
            const docId = `${attendanceDate}_${selectedBranch}_${selectedYear}_${selectedSection}`;
            try {
                const docRef = doc(db, 'attendance', docId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setAttendance(data.records || {});
                    setTopic(data.topic || '');
                    setIsEditMode(true);
                    setEditingDocId(docId);
                    setEditingTimestamp(data.timestamp);
                } else {
                    // No existing record for this combination
                    if (isEditMode) {
                        setAttendance({});
                        setTopic('');
                        setIsEditMode(false);
                        setEditingDocId(null);
                        setEditingTimestamp(null);
                    } else {
                        // Just clear fresh state
                        setAttendance({});
                        setTopic('');
                    }
                }
            } catch (error) {
                console.error("Error checking existing attendance:", error);
            }
        };

        checkExisting();
    }, [attendanceDate, selectedBranch, selectedYear, selectedSection]);

    const loadRecentSubmissions = async () => {
        if (!currentUser) {
            console.log('loadRecentSubmissions: No current user');
            return;
        }

        console.log('loadRecentSubmissions: Starting to load for user:', currentUser.uid);
        setLoadingRecent(true);

        try {
            // Query without orderBy to avoid index requirement
            // We'll sort client-side instead
            const q = query(
                collection(db, 'attendance'),
                limit(100) // Get recent records
            );

            const snapshot = await getDocs(q);
            const allDocs = snapshot.docs.map((doc: any) => ({
                id: doc.id,
                ...doc.data()
            }));

            // Filter by current faculty (or department for HODs) and sort by timestamp
            const submissions = allDocs
                .filter((sub: any) => {
                    const isOwnSubmission = sub.facultyId === currentUser.uid;
                    const isHODOfDepartment = currentUser.role === 'hod' && sub.branch === currentUser.department;

                    if (isOwnSubmission || isHODOfDepartment) {
                        return true;
                    }
                    return false;
                })
                .sort((a: any, b: any) => {
                    // Sort by timestamp descending (newest first)
                    const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
                    const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
                    return timeB - timeA;
                })
                .slice(0, 20); // Show more for HODs if needed (increased to 20)

            setRecentSubmissions(submissions);
        } catch (error) {
            console.error('Error loading recent submissions:', error);
            alert('Failed to load recent submissions.');
        } finally {
            setLoadingRecent(false);
        }
    };

    const canEdit = (timestamp: any): boolean => {
        if (!timestamp) return false;

        const submittedTime = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const hoursDiff = (now.getTime() - submittedTime.getTime()) / (1000 * 60 * 60);

        return hoursDiff <= 2;
    };

    const loadAttendanceForEdit = async (docId: string) => {
        try {
            const docRef = doc(db, 'attendance', docId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();

                // Check if can edit
                if (!canEdit(data.timestamp)) {
                    alert('This attendance record is older than 2 hours and cannot be edited.');
                    return;
                }

                // Set filters to match the record
                setSelectedBranch(data.branch);
                setSelectedYear(data.year);
                setSelectedSection(data.section);
                setAttendanceDate(data.date);

                // Load attendance records
                setAttendance(data.records || {});
                setTopic(data.topic || '');

                // Set edit mode
                setIsEditMode(true);
                setEditingDocId(docId);
                setEditingTimestamp(data.timestamp);
                setShowRecentSubmissions(false);

                alert('Loaded for editing. You can modify and re-submit.');
            }
        } catch (error) {
            console.error('Error loading attendance for edit:', error);
            alert('Failed to load attendance record.');
        }
    };

    const cancelEdit = () => {
        setIsEditMode(false);
        setEditingDocId(null);
        setEditingTimestamp(null);
        setAttendance({});
        setTopic('');
    };

    const [fetchedStudents, setFetchedStudents] = useState<any[]>([]);
    const [loadingStudents, setLoadingStudents] = useState(false);

    // Fetch students from Firestore based on selection
    useEffect(() => {
        const fetchStudents = async () => {
            setLoadingStudents(true);
            try {
                // Path: admin/students/{branch}/{year}/{section}
                // Note: Year is a document, Section is a subcollection
                const studentsRef = collection(db, 'admin', 'students', selectedBranch, String(selectedYear), selectedSection);
                const snapshot = await getDocs(studentsRef);

                const fromDb = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                setFetchedStudents(fromDb);
            } catch (error) {
                console.error("Error fetching students:", error);
            } finally {
                setLoadingStudents(false);
            }
        };

        if (selectedBranch && selectedYear && selectedSection) {
            fetchStudents();
        }
    }, [selectedBranch, selectedYear, selectedSection]);

    // derived list of students based on filters (Merged Local + DB)
    const filteredStudents = useMemo(() => {
        // 1. Process Local JSON Data
        const allLocalStudents = Object.entries(studentData as Record<string, string>)
            .map(([regNo, name]) => {
                const { data: info, calculatedYear, entryType } = detectBranchInfo(regNo);
                return {
                    regNo,
                    uid: regNo, // Placeholder UID for local data
                    name,
                    branch: info?.branch || 'Unknown',
                    year: calculatedYear || 0,
                    entryType,
                    section: 'A', // Default assumption for local data if not specified, but logic below filters it
                    isLocal: true
                };
            })
            .filter(student =>
                student.branch === selectedBranch &&
                student.year === selectedYear
                // Local data doesn't have section info usually, so we might show them in all sections 
                // OR we strictly assume Section 'A' if not defined? 
                // For now, let's include them to be safe, or maybe user wants them partitioned.
                // If we assume local JSON is "all sections", we can't easily filter by section without a map.
                // Let's assume they appear in 'A' by default or we shouldn't filter strict on section for local unless we know.
                // Given the user expectation: "Not getting ALL students", likely they want to see them.
            );

        // 2. Process Fetched DB Students
        const dbStudents = fetchedStudents.map(s => ({
            regNo: s.registrationNumber || s.regNo || '',
            uid: s.uid || s.id,
            name: s.name || 'Unknown',
            branch: s.branch,
            year: s.year,
            section: s.section,
            entryType: s.entryType || (s.registrationNumber ? detectBranchInfo(s.registrationNumber).entryType : 'Regular'),
            isLocal: false
        }));

        // 3. Merge Strategies
        // We want DB students to take precedence (they might have updated names/details)
        // We also want to ensure we don't duplicate by RegNo

        const mergedMap = new Map();

        // Add Local first
        allLocalStudents.forEach(s => {
            // Only add local students if we are viewing Section A (default assignment) 
            // OR if we want them visible everywhere. 
            // Better approach: If local student isn't in DB, show them.
            // But we need to decide which section they belong to.
            // IF the user is selecting Section A, show them. If B, maybe not?
            // To be safe and show "all", we include them if selectedSection is 'A' (Standard)
            // or if we decide local json implies a specific section.
            // Let's stick to the previous behavior: The previous code filtered purely by branch/year.
            // It didn't filter by Section because the previous code didn't have section info in JSON.
            // So previously, ALL students of a branch/year appeared in ALL sections.
            // We should PROBABLY keep that behavior for local data to avoid "missing" students when switching sections.
            mergedMap.set(s.regNo, s);
        });

        // Overwrite/Add DB students
        dbStudents.forEach(s => {
            // DB students definitely belong to this section because we fetched from that path
            mergedMap.set(s.regNo, s);
        });

        return Array.from(mergedMap.values())
            .sort((a, b) => a.regNo.localeCompare(b.regNo));

    }, [selectedBranch, selectedYear, selectedSection, fetchedStudents]);

    const handleMark = (regNo: string, status: 'Present' | 'Absent') => {
        setAttendance(prev => ({
            ...prev,
            [regNo]: status
        }));
    };

    const markAll = (status: 'Present' | 'Absent') => {
        const newAttendance = { ...attendance };
        filteredStudents.forEach(s => {
            newAttendance[s.regNo] = status;
        });
        setAttendance(newAttendance);
    };

    const handleSubmitClick = () => {
        // Prevent future attendance
        const today = new Date().toISOString().split('T')[0];
        if (attendanceDate > today) {
            alert('Cannot mark attendance for future dates.');
            return;
        }

        // Identify unmarked students
        const unmarked = filteredStudents.filter(s => !attendance[s.regNo]);

        if (unmarked.length > 0) {
            setUnmarkedStudents(unmarked);
            setShowConfirmModal(true);
        } else {
            // All marked, proceed directly (defaulting nothing as none are left, strictly speaking)
            // But we pass 'Present' just in case or null
            finalizeSubmission();
        }
    };

    const finalizeSubmission = async (defaultForUnmarked: 'Present' | 'Absent' = 'Present') => {
        if (!currentUser) return;

        // Check edit permission if in edit mode
        if (isEditMode && editingTimestamp && !canEdit(editingTimestamp)) {
            alert('This attendance record is older than 2 hours and can no longer be edited.');
            return;
        }

        setIsSubmitting(true);
        setShowConfirmModal(false);

        try {
            const finalRecords: Record<string, string> = {};
            let presentCount = 0;
            let absentCount = 0;

            filteredStudents.forEach(s => {
                const status = attendance[s.regNo] || defaultForUnmarked;
                finalRecords[s.regNo] = status;
                if (status === 'Present') presentCount++;
                else absentCount++;
            });

            const docId = `${attendanceDate}_${selectedBranch}_${selectedYear}_${selectedSection}`;
            const attendanceRef = doc(db, 'attendance', docId);

            const facultyId = currentUser.uid || currentUser.email || 'unknown';

            const attendanceData = {
                date: attendanceDate,
                branch: selectedBranch,
                year: selectedYear,
                section: selectedSection,
                facultyId: facultyId,
                facultyName: currentUser.name || 'Faculty',
                records: finalRecords,
                topic: topic,
                stats: {
                    total: filteredStudents.length,
                    present: presentCount,
                    absent: absentCount
                },
                timestamp: serverTimestamp(),
                lastModified: isEditMode ? serverTimestamp() : null
            };

            // 1. Save to Firestore (for analytics and historical data)
            await setDoc(attendanceRef, attendanceData);

            // 2. Save to Realtime Database (for live/current data)
            const rtdbPath = `attendance/${attendanceDate}/${selectedBranch}/${selectedYear}/${selectedSection}`;
            const rtdbRef = ref(realtimeDb, rtdbPath);

            await setDb(rtdbRef, {
                ...attendanceData,
                timestamp: Date.now(), // Use numeric timestamp for RTDB
                lastModified: isEditMode ? Date.now() : null
            });

            // Create Log Entry (only for new submissions, not edits)
            if (!isEditMode) {
                const logMessage = `${selectedBranch} ${selectedYear === 1 ? '1st' : selectedYear === 2 ? '2nd' : selectedYear === 3 ? '3rd' : '4th'} Year Taken by ${currentUser.name}`;
                addDoc(collection(db, 'logs'), {
                    message: logMessage,
                    type: 'attendance',
                    branch: selectedBranch,
                    year: selectedYear,
                    timestamp: serverTimestamp(),
                    facultyName: currentUser.name
                }).catch(err => console.error("Log error:", err));
            }

            // --- OPTIMISTIC UI: Update the local list immediately ---
            const optimisticSubmission = {
                id: docId,
                ...attendanceData,
                timestamp: { toDate: () => new Date() }, // Mock Firestore timestamp for UI
                isOptimistic: true
            };

            setRecentSubmissions(prev => {
                const filtered = prev.filter(s => s.id !== docId);
                return [optimisticSubmission, ...filtered].slice(0, 20);
            });
            setShowRecentSubmissions(true);
            // -------------------------------------------------------

            // Reset edit mode
            if (isEditMode) {
                cancelEdit();
            }

            setIsSuccess(true);
            setTimeout(() => setIsSuccess(false), 3000);

            // Sync to get server timestamps properly
            loadRecentSubmissions();

            alert('Attendance submitted successfully!');

        } catch (error) {
            console.error('Error submitting attendance:', error);
            // Rollback optimistic update on error
            loadRecentSubmissions();
            alert('Failed to submit attendance. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6 relative">
            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-200 dark:border-gray-700">
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-4 text-amber-600">
                                <AlertTriangle className="w-8 h-8" />
                                <h3 className="text-xl font-bold">Unmarked Students</h3>
                            </div>

                            <p className="text-gray-600 dark:text-gray-300 mb-4">
                                You have <strong>{unmarkedStudents.length}</strong> students without a marked status.
                                How would you like to handle them?
                            </p>

                            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 mb-6 max-h-40 overflow-y-auto border border-gray-100 dark:border-gray-700">
                                <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                                    {unmarkedStudents.slice(0, 5).map(s => (
                                        <li key={s.regNo} className="flex justify-between">
                                            <span className="font-mono text-gray-500">{s.regNo}</span>
                                            <span>{s.name}</span>
                                        </li>
                                    ))}
                                    {unmarkedStudents.length > 5 && (
                                        <li className="text-center text-xs text-gray-500 italic pt-2">
                                            + {unmarkedStudents.length - 5} more...
                                        </li>
                                    )}
                                </ul>
                            </div>

                            <div className="space-y-3">
                                <button
                                    onClick={() => finalizeSubmission('Present')}
                                    className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    <UserCheck className="w-4 h-4" />
                                    Mark Remaining as Present & Submit
                                </button>
                                <button
                                    onClick={() => finalizeSubmission('Absent')}
                                    className="w-full py-3 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    <UserX className="w-4 h-4" />
                                    Mark Remaining as Absent & Submit
                                </button>
                                <button
                                    onClick={() => setShowConfirmModal(false)}
                                    className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                                >
                                    Cancel & Review
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Header / Filters */}
            <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <UserCheck className="w-6 h-6 md:w-8 md:h-8 text-primary-600" />
                        Mark Attendance
                    </h1>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-sm text-gray-500 w-full md:w-auto">
                        <span className="hidden sm:inline">Date:</span>
                        <input
                            type="date"
                            value={attendanceDate}
                            max={new Date().toISOString().split('T')[0]}
                            onChange={(e) => setAttendanceDate(e.target.value)}
                            className="input-field py-2 px-3 w-full sm:w-auto"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <select
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        className="input-field"
                    >
                        <option value="EEE">EEE</option>
                        <option value="ECE">ECE</option>
                        <option value="CSE">CSE</option>
                        <option value="IT">IT</option>
                        <option value="MECH">MECH</option>
                        <option value="CIVIL">CIVIL</option>
                    </select>

                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="input-field"
                    >
                        <option value={1}>1st Year</option>
                        <option value={2}>2nd Year</option>
                        <option value={3}>3rd Year</option>
                        <option value={4}>4th Year</option>
                    </select>

                    <select
                        value={selectedSection}
                        onChange={(e) => setSelectedSection(e.target.value)}
                        className="input-field"
                    >
                        <option value="A">Section A</option>
                        <option value="B">Section B</option>
                        <option value="C">Section C</option>
                    </select>
                </div>

                {/* Topic Input */}
                <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Topic Discussed
                    </label>
                    <input
                        type="text"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="Enter the topic discussed in this class..."
                        className="input-field w-full"
                    />
                </div>

                {/* Edit Mode Indicator */}
                {isEditMode && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-2 text-blue-700">
                            <Edit2 className="w-5 h-5" />
                            <span className="font-medium">Edit Mode Active</span>
                        </div>
                        <button
                            onClick={cancelEdit}
                            className="px-3 py-1 bg-white border border-blue-300 text-blue-700 rounded-md hover:bg-blue-100 transition-colors text-sm"
                        >
                            Cancel Edit
                        </button>
                    </div>
                )}

                {/* Recent Submissions Toggle */}
                {!isEditMode && (
                    <div className="mt-4">
                        <button
                            onClick={() => setShowRecentSubmissions(!showRecentSubmissions)}
                            className="flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium text-sm"
                        >
                            <RefreshCw className="w-4 h-4" />
                            {showRecentSubmissions ? 'Hide' : 'Show'} Recent Submissions
                        </button>
                    </div>
                )}
            </div>

            {/* Recent Submissions Section */}
            {showRecentSubmissions && !isEditMode && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                        <h3 className="font-semibold text-gray-800 dark:text-gray-200">Recent Submissions (Last 24 Hours)</h3>
                    </div>
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {loadingRecent ? (
                            <div className="p-4 space-y-4">
                                <Skeleton className="h-20 rounded-xl" />
                                <Skeleton className="h-20 rounded-xl" />
                                <Skeleton className="h-20 rounded-xl" />
                            </div>
                        ) : recentSubmissions.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                No recent submissions found.
                            </div>
                        ) : (
                            recentSubmissions.map((submission) => {
                                const isOwnSubmission = submission.facultyId === currentUser?.uid;
                                const editable = canEdit(submission.timestamp);
                                const submittedTime = submission.timestamp?.toDate ? submission.timestamp.toDate() : new Date(submission.timestamp);
                                const timeAgo = Math.floor((new Date().getTime() - submittedTime.getTime()) / (1000 * 60));

                                return (
                                    <div key={submission.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-1">
                                                    <span className="font-semibold text-gray-900 dark:text-white">
                                                        {submission.branch} - Year {submission.year} - Section {submission.section}
                                                    </span>
                                                    <span className="text-sm text-gray-500">
                                                        {submission.date}
                                                    </span>
                                                    {submission.facultyName && currentUser?.role === 'hod' && !isOwnSubmission && (
                                                        <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                                                            By: {submission.facultyName}
                                                        </span>
                                                    )}
                                                </div>
                                                {submission.topic && (
                                                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 italic">
                                                        Topic: {submission.topic}
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                                                    <span>Present: {submission.stats?.present || 0}</span>
                                                    <span>Absent: {submission.stats?.absent || 0}</span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {timeAgo < 60 ? `${timeAgo}m ago` : `${Math.floor(timeAgo / 60)}h ago`}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex bg-gray-50 dark:bg-gray-700 p-1 rounded-lg border border-gray-100 dark:border-gray-600">
                                                    {isOwnSubmission && editable && (
                                                        <button
                                                            onClick={() => loadAttendanceForEdit(submission.id)}
                                                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                            Edit
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => setViewingAbsentees(submission)}
                                                        className="flex items-center gap-2 px-4 py-2 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors text-sm"
                                                    >
                                                        <Users className="w-4 h-4" />
                                                        Absentees
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {/* Absentees Modal */}
            {viewingAbsentees && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Users className="w-5 h-5 text-red-500" />
                                    Absentees List
                                </h3>
                                <p className="text-xs text-gray-500">
                                    {viewingAbsentees.branch} {viewingAbsentees.year}Y {viewingAbsentees.section} | {viewingAbsentees.date}
                                </p>
                            </div>
                            <button onClick={() => setViewingAbsentees(null)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="max-h-[60vh] overflow-y-auto p-4">
                            {Object.entries(viewingAbsentees.records || {})
                                .filter(([_, status]) => status === 'Absent')
                                .length > 0 ? (
                                <div className="space-y-2">
                                    {Object.entries(viewingAbsentees.records || {})
                                        .filter(([_, status]) => status === 'Absent')
                                        .map(([regNo], idx) => (
                                            <div key={regNo} className="flex items-center justify-between p-3 bg-red-50/30 dark:bg-red-900/10 rounded-xl border border-red-100/50 dark:border-red-900/20">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{(studentData as Record<string, string>)[regNo] || 'Unknown'}</span>
                                                    <span className="text-[10px] text-gray-500 font-mono uppercase italic">{regNo}</span>
                                                </div>
                                                <div className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-[10px] font-bold rounded">ABSENT</div>
                                            </div>
                                        ))}
                                </div>
                            ) : (
                                <div className="py-8 text-center bg-green-50 dark:bg-green-900/10 rounded-xl">
                                    <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                                    <p className="font-bold text-green-700 dark:text-green-400">Perfect!</p>
                                    <p className="text-xs text-green-600 dark:text-green-500">No absentees.</p>
                                </div>
                            )}
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                            <button onClick={() => setViewingAbsentees(null)} className="px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg font-bold hover:opacity-90 transition-opacity">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Student List */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50 dark:bg-gray-900/50">
                    <span className="font-semibold text-gray-700 dark:text-gray-200">
                        Students ({filteredStudents.length})
                    </span>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <button
                            onClick={() => markAll('Present')}
                            disabled={attendanceDate > new Date().toISOString().split('T')[0]}
                            className="flex-1 sm:flex-none px-3 py-2 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-center disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Mark All Present
                        </button>
                        <button
                            onClick={() => markAll('Absent')}
                            disabled={attendanceDate > new Date().toISOString().split('T')[0]}
                            className="flex-1 sm:flex-none px-3 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-center disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Mark All Absent
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 font-medium text-sm">
                            <tr>
                                <th className="p-4 w-16">S.No</th>
                                <th className="p-4">Reg No</th>
                                <th className="p-4">Name</th>
                                <th className="p-4 hidden md:table-cell">Type</th>
                                <th className="p-4 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredStudents.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-400">
                                        No students found matching filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredStudents.map((student, index) => {
                                    const status = attendance[student.regNo];
                                    return (
                                        <tr key={student.regNo} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                            <td className="p-4 text-gray-400 text-sm">
                                                {index + 1}
                                            </td>
                                            <td className="p-4 font-mono text-gray-600 dark:text-gray-400">
                                                {student.regNo}
                                            </td>
                                            <td className="p-4 font-medium text-gray-900 dark:text-white">
                                                {student.name}
                                            </td>
                                            <td className="p-4 hidden md:table-cell text-sm text-gray-500">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${student.entryType === 'Lateral Entry'
                                                    ? 'bg-purple-100 text-purple-700'
                                                    : 'bg-blue-100 text-blue-700'
                                                    }`}>
                                                    {student.entryType || 'Regular'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className="flex justify-center gap-2">
                                                    <button
                                                        onClick={() => handleMark(student.regNo, 'Present')}
                                                        disabled={attendanceDate > new Date().toISOString().split('T')[0]}
                                                        className={`p-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${status === 'Present'
                                                            ? 'bg-green-500 text-white shadow-md scale-105'
                                                            : 'bg-gray-100 text-gray-400 hover:bg-green-100 hover:text-green-600'
                                                            }`}
                                                    >
                                                        <UserCheck className="w-5 h-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleMark(student.regNo, 'Absent')}
                                                        disabled={attendanceDate > new Date().toISOString().split('T')[0]}
                                                        className={`p-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${status === 'Absent'
                                                            ? 'bg-red-500 text-white shadow-md scale-105'
                                                            : 'bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-600'
                                                            }`}
                                                    >
                                                        <UserX className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {filteredStudents.length > 0 && (
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-end">
                        <button
                            onClick={handleSubmitClick}
                            disabled={isSubmitting || attendanceDate > new Date().toISOString().split('T')[0]}
                            className="flex items-center gap-2 px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg shadow-lg hover:shadow-xl transition-all font-medium transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save className="w-5 h-5" />
                            {attendanceDate > new Date().toISOString().split('T')[0] ? 'Future Date Restricted' : isSubmitting ? 'Saving...' : isSuccess ? 'Saved Successfully!' : isEditMode ? 'Update Attendance' : 'Submit Attendance'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
