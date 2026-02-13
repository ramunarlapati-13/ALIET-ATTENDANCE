'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { detectBranchInfo } from '@/utils/branchDetector';
import { LayoutList, BookOpen, AlertCircle, FileText, Calculator } from 'lucide-react';

interface Subject {
    id: string;
    name: string;
}

interface MarkEntry {
    exam: string;
    assignment: string;
    total: number;
}

// Maps Subject ID -> Marks
type StudentMarks = Record<string, MarkEntry>;

// Maps Exam Type -> StudentMarks
type ExamData = Record<string, StudentMarks>;

export default function StudentMarksPage() {
    const { currentUser } = useAuth();
    const [branch, setBranch] = useState<string>('');
    const [selectedYear, setSelectedYear] = useState<number>(1);

    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [examData, setExamData] = useState<ExamData>({});
    const [loading, setLoading] = useState(true);

    const [maxYear, setMaxYear] = useState<number>(4);

    // Initial Branch & Year Detection
    useEffect(() => {
        if (currentUser?.uid) {
            const { data, calculatedYear } = detectBranchInfo(currentUser.uid);

            const userBranch = data?.branch || currentUser.department || '';
            setBranch(userBranch);

            // Determine current year of student
            // Prefer database year, fallback to calculation, fallback to 1
            const currentYear = currentUser.year || calculatedYear || 1;

            // Limit tabs to current year (e.g. if 3rd year, show 1, 2, 3)
            setMaxYear(currentYear);

            // Default select the latest year
            setSelectedYear(currentYear);
        }
    }, [currentUser]);

    // Fetch Data on Branch/Year Change
    useEffect(() => {
        const fetchData = async () => {
            if (!branch || !currentUser?.uid) return;
            setLoading(true);

            try {
                // 1. Fetch Subjects for this Branch & Year
                const classConfigId = `${branch}_${selectedYear}`;
                const subjectRef = doc(db, 'class_subjects', classConfigId);
                const subjectSnap = await getDoc(subjectRef);

                let loadedSubjects: Subject[] = [];
                if (subjectSnap.exists() && subjectSnap.data().subjects) {
                    loadedSubjects = subjectSnap.data().subjects;
                }
                setSubjects(loadedSubjects);

                // 2. Fetch Marks for this Branch & Year
                const marksCollection = collection(db, 'marks_class_consolidated');
                const q = query(
                    marksCollection,
                    where('branch', '==', branch),
                    where('year', '==', selectedYear)
                );

                const querySnapshot = await getDocs(q);
                const newExamData: ExamData = {};

                querySnapshot.docs.forEach(docSnap => {
                    const data = docSnap.data();
                    const examType = data.examType;

                    // Marks are stored by Registration Number, not UID
                    const studentKey = currentUser.registrationNumber || currentUser.uid;

                    if (data.marks && data.marks[studentKey]) {
                        newExamData[examType] = data.marks[studentKey];
                    }
                });

                setExamData(newExamData);

            } catch (error) {
                console.error("Error fetching student marks:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [branch, selectedYear, currentUser]);

    const calculateGrandTotal = (marks: StudentMarks) => {
        let gainedMarks = 0;
        let maxTotal = subjects.length * 20;

        subjects.forEach(sub => {
            const record = marks[sub.id];
            if (record && record.total) {
                gainedMarks += record.total;
            }
        });

        return { gained: gainedMarks, max: maxTotal };
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="p-4 max-w-4xl mx-auto space-y-6 pb-24">
            {/* Header Card */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <LayoutList className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                            Academic Performance
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Check your internal marks and assignment scores.
                        </p>
                    </div>

                    {/* Year Selector */}
                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 p-1 rounded-lg border border-gray-200 dark:border-gray-600">
                        {Array.from({ length: maxYear }, (_, i) => i + 1).map((year) => (
                            <button
                                key={year}
                                onClick={() => setSelectedYear(year)}
                                className={`
                                    px-3 py-1.5 text-xs font-semibold rounded-md transition-all
                                    ${selectedYear === year
                                        ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                    }
                                `}
                            >
                                {year === 1 ? '1st' : year === 2 ? '2nd' : year === 3 ? '3rd' : '4th'} Year
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* No Data State */}
            {Object.keys(examData).length === 0 && (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                    <div className="bg-gray-50 dark:bg-gray-900/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">No marks found</h3>
                    <p className="text-gray-500 text-sm mt-1">
                        No marks records are available for {branch} - Year {selectedYear}.
                    </p>
                </div>
            )}

            {/* Exam Cards */}
            <div className="grid gap-6">
                {['Mid-1', 'Mid-2', 'Semester'].map((examType) => {
                    const marks = examData[examType];
                    if (!marks) return null;

                    const { gained, max } = calculateGrandTotal(marks);
                    const percentage = max > 0 ? Math.round((gained / max) * 100) : 0;

                    return (
                        <div key={examType} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-all hover:shadow-md">
                            {/* Card Header */}
                            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-lg">
                                        {examType.charAt(0)}
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-gray-900 dark:text-white text-lg">{examType}</h2>
                                        <p className="text-xs text-gray-500 font-medium">
                                            {subjects.length} Subjects Evaluated
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Total Score</p>
                                    <div className="flex items-baseline gap-1 justify-end">
                                        <span className="text-2xl font-bold text-gray-900 dark:text-white">{gained}</span>
                                        <span className="text-sm text-gray-400">/ {max}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700">
                                <div
                                    className={`h-full rounded-r-full transition-all duration-1000 ${percentage >= 75 ? 'bg-green-500' :
                                        percentage >= 50 ? 'bg-blue-500' :
                                            percentage >= 35 ? 'bg-yellow-500' : 'bg-red-500'
                                        }`}
                                    style={{ width: `${percentage}%` }}
                                />
                            </div>

                            {/* Marks Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                                        <tr>
                                            <th className="px-6 py-3 font-semibold">Subject</th>
                                            <th className="px-6 py-3 text-center">Exam (15)</th>
                                            <th className="px-6 py-3 text-center">Assign (5)</th>
                                            <th className="px-6 py-3 text-center font-bold text-gray-700 dark:text-gray-300">Total (20)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {subjects.map((subject) => {
                                            const record = marks[subject.id];
                                            const hasData = !!record;

                                            const examVal = record?.exam || '-';
                                            const assignVal = record?.assignment || '-';
                                            const totalVal = hasData && (record.exam || record.assignment) ? record.total : '-';

                                            return (
                                                <tr key={subject.id} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                                        <BookOpen className="w-4 h-4 text-gray-400" />
                                                        {subject.name}
                                                    </td>
                                                    <td className="px-6 py-4 text-center text-gray-600 dark:text-gray-300">{examVal}</td>
                                                    <td className="px-6 py-4 text-center text-gray-600 dark:text-gray-300">{assignVal}</td>
                                                    <td className="px-6 py-4 text-center font-bold text-indigo-600 dark:text-indigo-400">
                                                        {totalVal}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    {/* Footer Row for Grand Total */}
                                    <tfoot className="bg-gray-50 dark:bg-gray-900/30 font-semibold text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-700">
                                        <tr>
                                            <td className="px-6 py-3 flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                                                <Calculator className="w-4 h-4" /> Grand Total
                                            </td>
                                            <td className="px-6 py-3 text-center opacity-50 text-xs">Max: {subjects.length * 15}</td>
                                            <td className="px-6 py-3 text-center opacity-50 text-xs">Max: {subjects.length * 5}</td>
                                            <td className="px-6 py-3 text-center text-lg">{gained} <span className="text-xs font-normal text-gray-500">/ {max}</span></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
