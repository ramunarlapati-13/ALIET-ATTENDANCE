'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
    db,
    doc,
    getDoc,
    collection,
    query,
    where,
    getDocs,
    orderBy,
    Timestamp
} from '@/lib/firebase/config';
import { FileSpreadsheet, Download, Filter, Search, Calendar, ChevronDown, Sheet, Table as TableIcon } from 'lucide-react';
import { detectBranchInfo } from '@/utils/branchDetector';
import studentData from '@/data/students.json';

export default function ReportsPage() {
    const { currentUser } = useAuth();

    // Filters
    const [branch, setBranch] = useState(currentUser?.department || 'EEE');
    const [year, setYear] = useState('2');
    const [semester, setSemester] = useState('1');
    const [section, setSection] = useState('A');
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1); // Default last month
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    // Data
    const [reportData, setReportData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const generateReport = async () => {
        setLoading(true);
        try {
            // 1. Fetch Students
            // Using logic similar to Attendance Page (merged local + db)
            // Ideally we fetch from DB admin/students collection to catch all
            const studentsRef = collection(db, 'admin', 'students', branch, year.toString(), section);
            const studentSnap = await getDocs(studentsRef);

            const dbStudents = studentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Merge with local standard
            const studentsMap = new Map();

            // Local Data (structure: RegNo -> Name)
            Object.entries(studentData as Record<string, string>).forEach(([regNo, name]) => {
                const { data: info, calculatedYear } = detectBranchInfo(regNo);
                if (info?.branch === branch && calculatedYear === parseInt(year)) {
                    studentsMap.set(regNo, { regNo, name, isLocal: true });
                }
            });

            // DB Data Overrides
            dbStudents.forEach((s: any) => {
                const regNo = s.registrationNumber || s.regNo;
                if (regNo) {
                    studentsMap.set(regNo, {
                        regNo,
                        name: s.name,
                        ...s
                    });
                }
            });

            const allStudents = Array.from(studentsMap.values()).sort((a: any, b: any) => a.regNo.localeCompare(b.regNo));

            // 2. Fetch Configured Subjects for the Semester
            const docId = `${branch}_${year}_${semester}`;
            const subjectDocRef = doc(db, 'class_subjects', docId);
            const subjectDocSnap = await getDoc(subjectDocRef);

            let semesterSubjects: string[] = [];
            if (subjectDocSnap.exists()) {
                semesterSubjects = subjectDocSnap.data().subjects || [];
            }

            // 3. Fetch Attendance Records
            const attRef = collection(db, 'attendance');
            const qSimple = query(
                attRef,
                where('branch', '==', branch),
                where('year', '==', parseInt(year)),
                where('semester', '==', semester),
                where('section', '==', section)
            );

            const attSnap = await getDocs(qSimple);
            const allDocs = attSnap.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as any))
                .filter(doc => doc.date >= startDate && doc.date <= endDate);

            // 4. Process Data for Matrix
            const subjectStats: Record<string, number> = {}; // Subject -> Total CC
            const studentStats: Record<string, Record<string, number>> = {}; // RegNo -> { Subject: CA }

            // Initialize all semester subjects (even if 0 CC)
            semesterSubjects.forEach(s => {
                subjectStats[s] = 0;
            });

            // Init student stats
            allStudents.forEach((s: any) => {
                studentStats[s.regNo] = {};
            });

            allDocs.forEach(doc => {
                const subj = doc.subject || 'Unknown';
                // Only count if it's in our semester subjects or keep if it has data
                if (!subjectStats[subj]) subjectStats[subj] = 0;
                subjectStats[subj]++; // Increment CC for this subject

                // Process records
                const records = doc.records || {};
                Object.entries(records).forEach(([regNo, status]) => {
                    if (studentStats[regNo]) {
                        if (!studentStats[regNo][subj]) studentStats[regNo][subj] = 0;
                        if (status === 'Present') {
                            studentStats[regNo][subj]++;
                        }
                    }
                });
            });

            // Ensure our final subject list is the union of configured + any extra that has data
            const finalSubjects = Array.from(new Set([...semesterSubjects, ...Object.keys(subjectStats)])).sort();

            setReportData({
                students: allStudents,
                subjects: finalSubjects,
                subjectCC: subjectStats,
                studentCA: studentStats,
                meta: { branch, year, semester, section, startDate, endDate }
            });

        } catch (error) {
            console.error("Error generating report:", error);
            alert("Failed to generate report. Ensure indexes are built or try simpler filters.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <FileSpreadsheet className="w-8 h-8 text-green-600" />
                        Attendance Report (CC/CA)
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Consolidated subject-wise attendance analysis
                    </p>
                </div>
                {reportData && (
                    <button
                        onClick={() => window.print()}
                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg shadow-sm flex items-center gap-2 text-sm font-medium"
                    >
                        <Download className="w-4 h-4" />
                        Export / Print
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 grid grid-cols-2 md:grid-cols-6 gap-3">
                <select value={branch} onChange={e => setBranch(e.target.value)} className="input-field p-2">
                    {['EEE', 'ECE', 'CSE', 'IT', 'MECH', 'CIVIL'].map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                <select value={year} onChange={e => setYear(e.target.value)} className="input-field p-2">
                    {[1, 2, 3, 4].map(y => <option key={y} value={y}>{y} Year</option>)}
                </select>
                <select value={semester} onChange={e => setSemester(e.target.value)} className="input-field p-2">
                    <option value="1">Sem 1</option>
                    <option value="2">Sem 2</option>
                </select>
                <select value={section} onChange={e => setSection(e.target.value)} className="input-field p-2">
                    {['A', 'B', 'C'].map(s => <option key={s} value={s}>Sec {s}</option>)}
                </select>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input-field p-2" />
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input-field p-2" />
            </div>

            <div className="flex justify-end">
                <button
                    onClick={generateReport}
                    disabled={loading}
                    className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg shadow-lg disabled:opacity-70 flex items-center gap-2 font-bold"
                >
                    {loading ? 'Generating...' : 'Generate Report'}
                </button>
            </div>

            {/* Report Table */}
            {reportData && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs md:text-sm border-collapse">
                            <thead>
                                <tr className="bg-gray-100 dark:bg-gray-900 border-b border-gray-300 dark:border-gray-700">
                                    <th rowSpan={2} className="p-2 border-r min-w-[50px] sticky left-0 bg-gray-100 dark:bg-gray-900 z-10">S.No</th>
                                    <th rowSpan={2} className="p-2 border-r min-w-[120px] sticky left-[50px] bg-gray-100 dark:bg-gray-900 z-10 text-left">Reg No</th>
                                    <th rowSpan={2} className="p-2 border-r min-w-[200px] text-left">Name of the student</th>

                                    {reportData.subjects.map((subj: string) => (
                                        <th key={subj} colSpan={2} className="p-2 border-r text-center font-bold bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 text-[10px] break-words uppercase">
                                            {subj}
                                        </th>
                                    ))}

                                    <th colSpan={2} className="p-2 border-r text-center font-bold bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300">TOTAL</th>
                                    <th rowSpan={2} className="p-2 text-center text-red-600 font-bold">%</th>
                                </tr>
                                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700 text-[10px]">
                                    {reportData.subjects.map((subj: string) => (
                                        <React.Fragment key={subj}>
                                            <th className="p-1 border-r text-center w-10 bg-gray-100/50">CC</th>
                                            <th className="p-1 border-r text-center w-10">CA</th>
                                        </React.Fragment>
                                    ))}

                                    <th className="p-1 border-r text-center w-10 bg-green-100/30">CC</th>
                                    <th className="p-1 border-r text-center w-10 bg-green-100/30">CA</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {reportData.subjects.length > 0 && (
                                    <tr className="bg-yellow-50 dark:bg-yellow-900/10 font-bold text-gray-700 dark:text-gray-300">
                                        <td className="p-2 border-r sticky left-0 bg-yellow-50 dark:bg-yellow-900/10 z-10">-</td>
                                        <td className="p-2 border-r sticky left-[50px] bg-yellow-50 dark:bg-yellow-900/10 z-10">-</td>
                                        <td className="p-2 border-r">Conducting Total</td>
                                        {reportData.subjects.map((subj: string) => (
                                            <React.Fragment key={subj}>
                                                <td className="p-2 border-r text-center text-blue-600 bg-blue-50/50">{reportData.subjectCC[subj]}</td>
                                                <td className="p-2 border-r text-center">-</td>
                                            </React.Fragment>
                                        ))}
                                        <td className="p-2 border-r text-center text-green-700 bg-green-50/50">
                                            {(Object.values(reportData.subjectCC) as number[]).reduce((a, b) => a + b, 0)}
                                        </td>
                                        <td className="p-2 border-r text-center">-</td>
                                        <td className="p-2 text-center">-</td>
                                    </tr>
                                )}

                                {reportData.students.map((student: any, idx: number) => {
                                    let totalStudentCA = 0;
                                    let totalOverallCC = 0;

                                    return (
                                        <tr key={student.regNo} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                            <td className="p-2 border-r text-center text-gray-500 sticky left-0 bg-white dark:bg-gray-800 z-10">{idx + 1}</td>
                                            <td className="p-2 border-r font-mono font-medium sticky left-[50px] bg-white dark:bg-gray-800 z-10">{student.regNo}</td>
                                            <td className="p-2 border-r text-gray-900 dark:text-gray-100 truncate max-w-[200px]">{student.name}</td>

                                            {reportData.subjects.map((subj: string) => {
                                                const cc = reportData.subjectCC[subj] || 0;
                                                const ca = (reportData.studentCA[student.regNo] && reportData.studentCA[student.regNo][subj]) || 0;

                                                totalOverallCC += cc;
                                                totalStudentCA += ca;

                                                const subPercent = cc > 0 ? Math.round((ca / cc) * 100) : 0;
                                                const colorClass = subPercent < 65 ? 'text-red-600 font-bold' : subPercent < 75 ? 'text-yellow-600' : 'text-green-600';

                                                return (
                                                    <React.Fragment key={`${student.regNo}-${subj}`}>
                                                        <td className="p-2 border-r text-center text-gray-400 text-[10px]">{cc}</td>
                                                        <td className={`p-2 border-r text-center font-medium ${colorClass}`}>{ca}</td>
                                                    </React.Fragment>
                                                );
                                            })}

                                            <td className="p-2 border-r text-center font-bold text-gray-700">{totalOverallCC}</td>
                                            <td className="p-2 border-r text-center font-bold text-gray-900 dark:text-white">{totalStudentCA}</td>
                                            <td className={`p-2 text-center font-bold ${(totalOverallCC > 0 ? (totalStudentCA / totalOverallCC) * 100 : 0) < 65 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                {totalOverallCC > 0 ? Math.round((totalStudentCA / totalOverallCC) * 100) : 0}%
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

