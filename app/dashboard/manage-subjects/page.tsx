'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Loader2, Plus, Trash2, BookOpen, Save, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ManageSubjectsPage() {
    return (
        <ProtectedRoute allowedRoles={['admin', 'hod', 'faculty']}>
            <SubjectManager />
        </ProtectedRoute>
    );
}

function SubjectManager() {
    const { currentUser } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Filters
    const [branch, setBranch] = useState(currentUser?.department || 'EEE');
    const [year, setYear] = useState('1'); // Storing as string 1-4
    const [semester, setSemester] = useState('1'); // 1 or 2

    // State
    const [subjects, setSubjects] = useState<string[]>([]);
    const [newSubject, setNewSubject] = useState('');

    const branches = ['CIVIL', 'EEE', 'MECH', 'ECE', 'CSE', 'IT', 'CSM', 'CSD'];

    // Load Subjects
    useEffect(() => {
        const fetchSubjects = async () => {
            setLoading(true);
            try {
                // Doc ID: branch_year_semester (e.g., EEE_2_1)
                const docId = `${branch}_${year}_${semester}`;
                const docRef = doc(db, 'class_subjects', docId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setSubjects(docSnap.data().subjects || []);
                } else {
                    setSubjects([]);
                }
            } catch (error) {
                console.error("Error fetching subjects:", error);
            } finally {
                setLoading(false);
            }
        };

        if (branch && year && semester) {
            fetchSubjects();
        }
    }, [branch, year, semester]);

    const handleAddSubject = () => {
        if (!newSubject.trim()) return;
        if (subjects.includes(newSubject.trim().toUpperCase())) {
            alert('Subject already exists');
            return;
        }
        setSubjects([...subjects, newSubject.trim().toUpperCase()]);
        setNewSubject('');
    };

    const handleRemoveSubject = (sub: string) => {
        setSubjects(subjects.filter(s => s !== sub));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const docId = `${branch}_${year}_${semester}`;
            const docRef = doc(db, 'class_subjects', docId);
            await setDoc(docRef, {
                branch,
                year,
                semester,
                subjects,
                lastUpdated: new Date()
            }, { merge: true });
            alert('Subjects configuration saved successfully!');
        } catch (error) {
            console.error("Error saving subjects:", error);
            alert('Failed to save subjects.');
        } finally {
            setSaving(false);
        }
    };

    // Access Control: Only Admin or HOD of the department
    const canEdit = currentUser?.role === 'admin' || (currentUser?.role === 'hod' && currentUser?.department === branch);

    if (!currentUser) return null;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => router.back()}
                        className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <BookOpen className="w-6 h-6 text-primary-600" />
                            Manage Subjects
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Configure syllabus subjects for attendance tracking.
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Branch</label>
                        <select
                            value={branch}
                            onChange={(e) => setBranch(e.target.value)}
                            disabled={currentUser.role === 'hod'} // HOD locked to their department?
                            className="w-full p-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700"
                        >
                            {branches.map(b => (
                                <option key={b} value={b}>{b}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Year</label>
                        <select
                            value={year}
                            onChange={(e) => setYear(e.target.value)}
                            className="w-full p-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700"
                        >
                            {[1, 2, 3, 4].map(y => (
                                <option key={y} value={y}>{y} Year</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Semester</label>
                        <select
                            value={semester}
                            onChange={(e) => setSemester(e.target.value)}
                            className="w-full p-2 border rounded-lg dark:bg-gray-900 dark:border-gray-700"
                        >
                            <option value="1">Semester 1</option>
                            <option value="2">Semester 2</option>
                        </select>
                    </div>
                </div>

                {/* Subject List */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Subjects List ({subjects.length})
                        </h3>
                        {/* Status Indicator */}
                        {loading && <Loader2 className="w-5 h-5 animate-spin text-primary-600" />}
                    </div>

                    {!canEdit && (
                        <div className="mb-4 p-3 bg-yellow-50 text-yellow-800 rounded-lg text-sm">
                            You do not have permission to edit subjects for this branch.
                        </div>
                    )}

                    <div className="space-y-3 mb-6">
                        {subjects.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                                No subjects configured for this semester.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                {subjects.map((sub, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 group">
                                        <span className="font-medium text-gray-800 dark:text-gray-200">{sub}</span>
                                        {canEdit && (
                                            <button
                                                onClick={() => handleRemoveSubject(sub)}
                                                className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                                                title="Remove Subject"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Add New Subject */}
                    {canEdit && (
                        <div className="flex gap-2 border-t pt-4 dark:border-gray-700">
                            <input
                                type="text"
                                value={newSubject}
                                onChange={(e) => setNewSubject(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddSubject()}
                                placeholder="Enter Subject Name (e.g., MPMC, DAA)"
                                className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-900 dark:border-gray-700"
                            />
                            <button
                                onClick={handleAddSubject}
                                disabled={!newSubject.trim()}
                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                            >
                                <Plus className="w-5 h-5" />
                                Add
                            </button>
                        </div>
                    )}
                </div>

                {/* Actions */}
                {canEdit && (
                    <div className="flex justify-end">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg shadow-lg font-medium flex items-center gap-2 disabled:opacity-70 transition-all"
                        >
                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            {saving ? 'Saving...' : 'Save Configuration'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
