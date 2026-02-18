'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import {
    db,
    doc,
    getDoc,
    collection,
    query,
    where,
    getDocs,
    orderBy,
    onSnapshot
} from '@/lib/firebase/config';
import studentData from '@/data/students.json';
import React from 'react';
import { detectBranchInfo } from '@/utils/branchDetector';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    LineChart,
    Line,
    Cell,
    PieChart,
    Pie
} from 'recharts';
import {
    Filter,
    Calendar,
    Users,
    TrendingUp,
    ArrowUpRight,
    Search,
    Download,
    FileSpreadsheet,
    FileText,
    ChevronDown,
    Printer
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import html2canvas from 'html2canvas';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function AnalyticsPage() {
    const { currentUser } = useAuth();

    // Filters
    const [selectedBranch, setSelectedBranch] = useState(currentUser?.department || 'EEE');
    const [selectedYear, setSelectedYear] = useState(2);
    const [selectedSemester, setSelectedSemester] = useState('1');
    const [selectedSection, setSelectedSection] = useState('A');

    // Get today's date in YYYY-MM-DD format
    const getTodayString = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 6); // Default last 6 months to cover the full semester
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(getTodayString());
    const [isLoading, setIsLoading] = useState(false);
    const [reportLoading, setReportLoading] = useState(false);

    // Helper: Format date to dd-mm-yyyy
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const [y, m, d] = dateStr.split('-');
        return `${d}-${m}-${y}`;
    };

    // Data State
    const [attendanceDocs, setAttendanceDocs] = useState<any[]>([]);
    const [overallPercent, setOverallPercent] = useState(0);
    const [fetchedStudents, setFetchedStudents] = useState<any[]>([]);

    // Graph Type State
    const [selectedGraph, setSelectedGraph] = useState('pie');
    const chartRef = useRef<HTMLDivElement>(null);

    // Mounted State for Hydration Fix
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    // Update default branch when currentUser loads
    useEffect(() => {
        if (currentUser?.department) {
            setSelectedBranch(currentUser.department);
        }
    }, [currentUser]);

    // 0. Fetch Students from Firestore (to include newly registered ones)
    useEffect(() => {
        async function fetchStudents() {
            try {
                const path = `admin/students/${selectedBranch}/${selectedYear}/${selectedSection}`;
                const ref = collection(db, path);
                const snap = await getDocs(ref);
                const students = snap.docs.map(d => ({
                    id: d.id,
                    ...d.data()
                }));
                setFetchedStudents(students);
            } catch (e) {
                console.error("Error fetching students:", e);
                setFetchedStudents([]);
            }
        }
        if (selectedBranch && selectedYear && selectedSection) {
            fetchStudents();
        }
    }, [selectedBranch, selectedYear, selectedSection]);

    // 1. Fetch Attendance Data (Real-time)
    useEffect(() => {
        setIsLoading(true);

        const q = query(
            collection(db, 'attendance'),
            where('branch', '==', selectedBranch),
            where('year', '==', selectedYear),
            where('semester', '==', selectedSemester),
            where('section', '==', selectedSection)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const docs = snapshot.docs.map(doc => doc.data());
            // Client-side sorting
            docs.sort((a, b) => a.date.localeCompare(b.date));
            setAttendanceDocs(docs);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching analytics:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [selectedBranch, selectedYear, selectedSemester, selectedSection]);

    // 2. Fetch Configured Subjects & Assignments
    const [semesterSubjects, setSemesterSubjects] = useState<string[]>([]);
    const [subjectAssignments, setSubjectAssignments] = useState<Record<string, any>>({});

    useEffect(() => {
        async function fetchSubjects() {
            setReportLoading(true);
            try {
                const docId = `${selectedBranch}_${selectedYear}_${selectedSemester}`;
                const ref = doc(db, 'class_subjects', docId);
                const snap = await getDoc(ref);
                if (snap.exists()) {
                    const data = snap.data();
                    setSemesterSubjects(data.subjects || []);
                    setSubjectAssignments(data.assignments || {});
                } else {
                    setSemesterSubjects([]);
                    setSubjectAssignments({});
                }
            } catch (e) {
                console.error("Error fetching subjects:", e);
                setSemesterSubjects([]);
                setSubjectAssignments({});
            } finally {
                setReportLoading(false);
            }
        }
        if (selectedBranch && selectedYear && selectedSemester) {
            fetchSubjects();
        }
    }, [selectedBranch, selectedYear, selectedSemester]);

    // 3. Helper: Calculate Stats for a given set of docs
    const calculateStats = (students: any[], docs: any[]) => {
        const totalClasses = docs.length;
        const statsMap = new Map();

        // Initialize with 0
        students.forEach(s => {
            statsMap.set(s.regNo, {
                name: s.name,
                regNo: s.regNo,
                present: 0,
                total: totalClasses,
                percent: 0
            });
        });

        // Tally attendance
        docs.forEach(doc => {
            const records = doc.records || {};
            students.forEach(s => {
                const status = records[s.regNo];
                if (status === 'Present' || status === 'present' || status === true) {
                    const current = statsMap.get(s.regNo);
                    if (current) current.present++;
                }
            });
        });

        // Calculate Percentages
        return Array.from(statsMap.values()).map((s: any) => ({
            ...s,
            percent: s.total > 0 ? Math.round((s.present / s.total) * 100) : 0
        })).sort((a: any, b: any) => a.regNo.localeCompare(b.regNo));
    };

    // 4. Derived State

    // A. Class Student List (Merged)
    const classStudents = useMemo(() => {
        // 1. Local JSON Students
        const allLocalStudents = Object.entries(studentData as Record<string, string>)
            .map(([regNo, name]) => {
                const { data: info, calculatedYear } = detectBranchInfo(regNo);
                return {
                    regNo,
                    name,
                    branch: info?.branch,
                    year: calculatedYear,
                    section: 'A' // Default assumption for local data
                };
            })
            // Filter local first roughly
            .filter(s => s.branch === selectedBranch && s.year === selectedYear);

        // 2. Map Firestore Students
        const dbStudents = fetchedStudents.map(s => ({
            regNo: s.registrationNumber || s.regNo || '',
            name: s.name || 'Unknown',
            branch: s.branch,
            year: s.year,
            section: s.section
        }));

        // 3. Merge Strategies
        const mergedMap = new Map();

        // Add Local first
        allLocalStudents.forEach(s => {
            // Only add local if section matches (assuming local is 'A' unless we have better logic, 
            // but here we filter rigorously if we knew section. 
            // Since local doesn't have section, we might rely on the user manually selecting 'A' 
            // or we include them if they are not in DB.
            // For safety, let's include if section is 'A' OR if not A, we might lose them? 
            // Actually, in AttendancePage we didn't filter local by section strictly because of this ambiguity.
            // But here, selectedSection is a filter.
            // Let's assume local JSON students are effectively "available for any section" or just 'A'.
            if (selectedSection === 'A') {
                mergedMap.set(s.regNo, s);
            }
        });

        // Overwrite/Add DB students (who DEFINITELY match the section because we fetched from that path)
        dbStudents.forEach(s => {
            mergedMap.set(s.regNo, s);
        });

        return Array.from(mergedMap.values())
            .sort((a: any, b: any) => a.regNo.localeCompare(b.regNo));
    }, [selectedBranch, selectedYear, selectedSection, fetchedStudents]);

    // B. Filtered Docs based on Date Range
    const filteredDocs = useMemo(() => {
        let docs = attendanceDocs;
        if (startDate) {
            docs = docs.filter(d => d.date >= startDate);
        }
        if (endDate) {
            docs = docs.filter(d => d.date <= endDate);
        }
        return docs;
    }, [attendanceDocs, startDate, endDate]);

    // C. Global Stats (Filtered)
    const globalStudentStats = useMemo(() => {
        return calculateStats(classStudents, filteredDocs);
    }, [classStudents, filteredDocs]);

    // D. Daily Stats (for Charts)
    const dailyStats = useMemo(() => {
        return filteredDocs.map(record => {
            const records = record.records || {};
            const values = Object.values(records);

            let total = values.length;
            let present = values.filter((v: any) => v === 'Present' || v === 'present' || v === true).length;

            if (total === 0 && record.stats) {
                total = record.stats.total || 0;
                present = record.stats.present || 0;
            }

            if (total === 0) total = 1;

            return {
                date: record.date,
                percent: Math.round((present / total) * 100),
                present,
                total,
                topic: record.topic || 'No Topic',
                subject: record.subject
            };
        });
    }, [filteredDocs]);

    // E. Matrix Data (Subject-wise for Detailed Report)
    const matrixData = useMemo(() => {
        const subjectCC: Record<string, number> = {};
        const studentCA: Record<string, Record<string, number>> = {};

        // Initialize subjects from configured list
        semesterSubjects.forEach(s => {
            subjectCC[s] = 0;
        });

        // Init student matrix
        classStudents.forEach(s => {
            studentCA[s.regNo] = {};
        });

        // Group attendance by subject
        filteredDocs.forEach(doc => {
            const subj = doc.subject || 'Unknown';
            if (!subjectCC[subj]) subjectCC[subj] = 0;
            subjectCC[subj]++;

            const records = doc.records || {};
            Object.entries(records).forEach(([regNo, status]) => {
                if (studentCA[regNo]) {
                    if (!studentCA[regNo][subj]) studentCA[regNo][subj] = 0;
                    if (status === 'Present' || status === 'present' || status === true) {
                        studentCA[regNo][subj]++;
                    }
                }
            });
        });

        // Get final sorted subject list (configured + any existing in stats)
        const finalSubjects = Array.from(new Set([...semesterSubjects, ...Object.keys(subjectCC)])).sort();

        return {
            subjects: finalSubjects,
            subjectCC,
            studentCA
        };
    }, [classStudents, filteredDocs, semesterSubjects]);

    // Overall Percentage
    useEffect(() => {
        if (dailyStats.length === 0) {
            setOverallPercent(0);
            return;
        }
        const totalPossible = dailyStats.reduce((acc, curr) => acc + curr.total, 0);
        const totalPresent = dailyStats.reduce((acc, curr) => acc + curr.present, 0);
        setOverallPercent(totalPossible > 0 ? Math.round((totalPresent / totalPossible) * 100) : 0);
    }, [dailyStats]);

    // 5. Compute Distribution Stats
    const distributionStats = useMemo(() => {
        const buckets = [
            { range: '90-100%', count: 0, fill: '#16a34a' },
            { range: '80-89%', count: 0, fill: '#22c55e' },
            { range: '70-79%', count: 0, fill: '#84cc16' },
            { range: '60-69%', count: 0, fill: '#facc15' },
            { range: '<60%', count: 0, fill: '#ef4444' }
        ];

        globalStudentStats.forEach((s: any) => {
            if (s.percent >= 90) buckets[0].count++;
            else if (s.percent >= 80) buckets[1].count++;
            else if (s.percent >= 70) buckets[2].count++;
            else if (s.percent >= 60) buckets[3].count++;
            else buckets[4].count++;
        });

        return buckets;
    }, [globalStudentStats]);


    const handleDownloadReport = (type: 'pdf' | 'excel' | 'csv') => {
        const fileName = `Attendance_Report_${selectedBranch}_${selectedYear}Year_${startDate}_to_${endDate}`;

        if (type === 'excel') {
            const headerInfo = [
                ["ALIET Attendance Report"],
                [`Branch: ${selectedBranch} | Year: ${selectedYear} | Section: ${selectedSection}`],
                [`Date Range: ${formatDate(startDate)} to ${formatDate(endDate)}`],
                [`Downloaded: ${new Date().toLocaleString()}`],
                []
            ];

            // Matrix Export Logic
            const headerRow1 = ["S.No", "Reg No", "Name"];
            const headerRow2 = ["", "", ""];

            matrixData.subjects.forEach(subj => {
                headerRow1.push(subj, "");
                headerRow2.push("CC", "CA");
            });

            headerRow1.push("TOTAL CC", "TOTAL CA", "OVERALL %");
            headerRow2.push("", "", "");

            const tableBody = globalStudentStats.map((s: any, i: number) => {
                const row = [i + 1, s.regNo, s.name];
                let totalSCC = 0;
                let totalSCA = 0;

                matrixData.subjects.forEach(subj => {
                    const cc = matrixData.subjectCC[subj] || 0;
                    const ca = (matrixData.studentCA[s.regNo] && matrixData.studentCA[s.regNo][subj]) || 0;
                    row.push(cc, ca);
                    totalSCC += cc;
                    totalSCA += ca;
                });

                row.push(totalSCC, totalSCA, (totalSCC > 0 ? Math.round((totalSCA / totalSCC) * 100) : 0) + '%');
                return row;
            });

            // Add Conducting Totals row
            const conductingTotalsRow: (string | number)[] = ["", "", "Conducting Totals (CC)"];
            let grandTotalCC = 0;
            matrixData.subjects.forEach(subj => {
                const cc = matrixData.subjectCC[subj] || 0;
                conductingTotalsRow.push(cc, "-");
                grandTotalCC += cc;
            });
            conductingTotalsRow.push(grandTotalCC, "-", "-");

            const wsData = [...headerInfo, headerRow1, headerRow2, conductingTotalsRow, ...tableBody];
            const ws = XLSX.utils.aoa_to_sheet(wsData);

            // Merges
            if (!ws['!merges']) ws['!merges'] = [];
            // Merges for Subject Headers
            let colIdx = 3;
            matrixData.subjects.forEach(() => {
                ws['!merges']!.push({ s: { r: headerInfo.length, c: colIdx }, e: { r: headerInfo.length, c: colIdx + 1 } });
                colIdx += 2;
            });

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Attendance Matrix");
            XLSX.writeFile(wb, `${fileName}.xlsx`);

        } else if (type === 'csv') {
            const data = globalStudentStats.map((s: any, i: number) => {
                const obj: any = {
                    'S.No': i + 1,
                    'Reg No': s.regNo,
                    'Name': s.name
                };
                let totalSCC = 0;
                let totalSCA = 0;
                matrixData.subjects.forEach(subj => {
                    const cc = matrixData.subjectCC[subj] || 0;
                    const ca = (matrixData.studentCA[s.regNo] && matrixData.studentCA[s.regNo][subj]) || 0;
                    obj[`${subj}_CC`] = cc;
                    obj[`${subj}_CA`] = ca;
                    totalSCC += cc;
                    totalSCA += ca;
                });
                obj['Total_CC'] = totalSCC;
                obj['Total_CA'] = totalSCA;
                obj['Percentage'] = (totalSCC > 0 ? Math.round((totalSCA / totalSCC) * 100) : 0) + '%';
                return obj;
            });
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Attendance");
            XLSX.writeFile(wb, `${fileName}.csv`);

        } else if (type === 'pdf') {
            const doc = new jsPDF('l', 'mm', 'a4'); // Landscape for Matrix
            doc.setFontSize(16);
            doc.text("ALIET Attendance Detailed Report", 14, 15);
            doc.setFontSize(10);
            doc.text(`Branch: ${selectedBranch} | Year: ${selectedYear} | Section: ${selectedSection}`, 14, 22);
            doc.text(`Date Range: ${formatDate(startDate)} to ${formatDate(endDate)} | Sem: ${selectedSemester}`, 14, 28);

            const heads = [
                [
                    { content: 'S.No', rowSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const } },
                    { content: 'Reg No', rowSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const } },
                    { content: 'Name', rowSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const } },
                    ...matrixData.subjects.map(subj => ({ content: subj, colSpan: 2, styles: { halign: 'center' as const } })),
                    { content: 'SUMMARY (TCC/TCA)', colSpan: 2, styles: { halign: 'center' as const } },
                    { content: '%', rowSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const } }
                ],
                [
                    ...matrixData.subjects.flatMap(() => ['CC', 'CA']),
                    'CC', 'CA'
                ]
            ];

            const body = globalStudentStats.map((s: any, i: number) => {
                let totalSCC = 0;
                let totalSCA = 0;
                const matrixCols = matrixData.subjects.flatMap(subj => {
                    const cc = matrixData.subjectCC[subj] || 0;
                    const ca = (matrixData.studentCA[s.regNo] && matrixData.studentCA[s.regNo][subj]) || 0;
                    totalSCC += cc;
                    totalSCA += ca;
                    return [cc, ca];
                });

                return [
                    i + 1,
                    s.regNo,
                    s.name,
                    ...matrixCols,
                    totalSCC,
                    totalSCA,
                    (totalSCC > 0 ? Math.round((totalSCA / totalSCC) * 100) : 0) + '%'
                ];
            });

            autoTable(doc, {
                startY: 35,
                head: heads,
                body: body,
                theme: 'grid',
                styles: {
                    fontSize: 7,
                    cellPadding: 2,
                    lineWidth: 0.1,
                    lineColor: [200, 200, 200]
                },
                headStyles: {
                    fillColor: [245, 245, 245],
                    textColor: [0, 0, 0],
                    fontStyle: 'bold',
                    lineWidth: 0.1,
                    lineColor: [150, 150, 150]
                },
                columnStyles: {
                    0: { cellWidth: 10 },
                    1: { cellWidth: 25 },
                    2: { cellWidth: 40 }
                }
            });

            doc.save(`${fileName}.pdf`);
        }
        setShowDownloadMenu(false);
    };

    const [showDownloadMenu, setShowDownloadMenu] = useState(false);
    const handleDownloadGraph = async () => {
        if (!chartRef.current) return;

        try {
            const canvas = await html2canvas(chartRef.current, {
                backgroundColor: '#ffffff', // Downloads usually need white bg for clarity
                scale: 2,
                onclone: (clonedDoc) => {
                    const clonedContainer = clonedDoc.getElementById('chart-container');
                    const controls = clonedDoc.getElementById('chart-controls');
                    if (controls) controls.style.display = 'none';
                    if (clonedContainer) {
                        const header = clonedDoc.createElement('div');
                        header.innerText = `Downloaded: ${new Date().toLocaleString()}`;
                        header.style.textAlign = 'center';
                        header.style.marginBottom = '20px';
                        header.style.fontSize = '12px';
                        header.style.color = '#6b7280';
                        header.style.fontFamily = 'monospace';
                        clonedContainer.insertBefore(header, clonedContainer.firstChild);
                        const footer = clonedDoc.createElement('div');
                        const rangeText = startDate || endDate ? ` (${formatDate(startDate) || 'Start'} to ${formatDate(endDate) || 'End'})` : '';
                        footer.innerText = `#${selectedYear === 1 ? '1st' : selectedYear === 2 ? '2nd' : selectedYear === 3 ? '3rd' : '4th'} Year ${selectedBranch} Students${rangeText}`;
                        footer.style.textAlign = 'center';
                        footer.style.marginTop = '20px';
                        footer.style.fontSize = '16px';
                        footer.style.fontWeight = 'bold';
                        footer.style.color = '#374151';
                        clonedContainer.appendChild(footer);
                    }
                }
            });

            const image = canvas.toDataURL("image/png");
            const link = document.createElement('a');
            link.href = image;
            link.download = `${selectedGraph}_chart_${new Date().toISOString().split('T')[0]}.png`;
            link.click();
        } catch (e) {
            console.error("Download failed", e);
        }
    };

    if (!mounted) return <></>;

    return (
        <div className="p-4 md:p-6 max-w-[100vw] mx-auto space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors duration-200">
            {/* Header & Filters */}
            <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <TrendingUp className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                            Attendance Analytics
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Visualize class performance and trends.</p>
                    </div>

                    {/* Filter Controls */}
                    <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 w-full sm:w-auto">
                            <select
                                value={selectedBranch}
                                onChange={(e) => setSelectedBranch(e.target.value)}
                                className="input-field py-2 text-sm w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                                {['EEE', 'ECE', 'CSE', 'IT', 'MECH', 'CIVIL'].map(b => (
                                    <option key={b} value={b}>{b}</option>
                                ))}
                            </select>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                className="input-field py-2 text-sm w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                                {[1, 2, 3, 4].map(y => (
                                    <option key={y} value={y}>{y === 1 ? '1st' : y === 2 ? '2nd' : y === 3 ? '3rd' : '4th'} Year</option>
                                ))}
                            </select>
                            <select
                                value={selectedSemester}
                                onChange={(e) => setSelectedSemester(e.target.value)}
                                className="input-field py-2 text-sm w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                                <option value="1">Sem 1</option>
                                <option value="2">Sem 2</option>
                            </select>
                            <select
                                value={selectedSection}
                                onChange={(e) => setSelectedSection(e.target.value)}
                                className="input-field py-2 text-sm w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                                {['A', 'B', 'C'].map(s => (
                                    <option key={s} value={s}>Section {s}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 w-full sm:w-auto">
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase whitespace-nowrap">Range:</span>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="text-sm outline-none text-gray-700 dark:text-gray-200 min-w-0 flex-1 sm:w-32 bg-transparent dark:[color-scheme:dark]"
                            />
                            <span className="text-gray-400">-</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="text-sm outline-none text-gray-700 dark:text-gray-200 min-w-0 flex-1 sm:w-32 bg-transparent dark:[color-scheme:dark]"
                            />
                        </div>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-md">
                                <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <span className="text-sm font-medium text-blue-800 dark:text-blue-300">Total Classes</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{attendanceDocs.length}</p>
                    </div>

                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-md">
                                <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
                            </div>
                            <span className="text-sm font-medium text-green-800 dark:text-green-300">Overall Attendance</span>
                        </div>
                        <p className="text-2xl font-bold text-green-900 dark:text-green-100">{overallPercent}%</p>
                    </div>

                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-100 dark:border-purple-800">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-md">
                                <ArrowUpRight className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <span className="text-sm font-medium text-purple-800 dark:text-purple-300">Avg. Students/Class</span>
                        </div>
                        <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                            {attendanceDocs.length > 0
                                ? Math.round(dailyStats.reduce((acc, curr) => acc + curr.present, 0) / attendanceDocs.length)
                                : 0}
                        </p>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Daily Trend Chart */}
                <div id="chart-container" className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700" ref={chartRef}>
                    <div id="chart-controls" className="flex justify-between items-center mb-6">
                        <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                            {selectedGraph === 'pie' ? 'Attendance Distribution (Pie)' :
                                selectedGraph === 'trend' ? 'Attendance Trend (Last 30 Days)' :
                                    selectedGraph === 'distribution' ? 'Student Performance Distribution' :
                                        'Daily Presence Count'}
                        </h3>
                        <div className="flex items-center gap-2">
                            <select
                                value={selectedGraph}
                                onChange={(e) => setSelectedGraph(e.target.value)}
                                className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
                            >
                                <option value="pie">Pie Chart</option>
                                <option value="trend">Trend Line</option>
                                <option value="distribution">Distribution</option>
                                <option value="daily">Daily Count</option>
                            </select>
                            <button
                                onClick={handleDownloadGraph}
                                className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                title="Download Chart"
                            >
                                <Download className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            {selectedGraph === 'pie' ? (
                                <PieChart>
                                    <Pie
                                        data={distributionStats}
                                        dataKey="count"
                                        nameKey="range"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        label={({ range, count }) => count > 0 ? `${range}` : ''}
                                    >
                                        {distributionStats.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value: number, name: string) => [`${value} Students`, name]}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend />
                                </PieChart>
                            ) : selectedGraph === 'trend' ? (
                                <LineChart data={dailyStats}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" strokeOpacity={0.2} />
                                    <XAxis
                                        dataKey="date"
                                        tick={{ fontSize: 12, fill: '#6b7280' }}
                                        tickFormatter={(val) => formatDate(val).substring(0, 5)}
                                    />
                                    <YAxis domain={[0, 100]} tick={{ fill: '#6b7280' }} />
                                    <Tooltip
                                        content={({ active, payload, label }) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload;
                                                return (
                                                    <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 shadow-lg rounded-lg">
                                                        <p className="font-bold text-gray-900 dark:text-gray-100">{label}</p>
                                                        <p className="text-blue-600 dark:text-blue-400 font-semibold">
                                                            Attendance: {data.percent}%
                                                        </p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                            ({data.present}/{data.total} Students)
                                                        </p>
                                                        {data.topic && data.topic !== 'No Topic' && (
                                                            <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                                                                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Topic:</p>
                                                                <p className="text-xs text-gray-600 dark:text-gray-400 italic max-w-[200px] break-words">
                                                                    {data.topic}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Legend />
                                    <Line
                                        type="monotone"
                                        dataKey="percent"
                                        name="Attendance %"
                                        stroke="#3b82f6"
                                        strokeWidth={2}
                                        activeDot={{ r: 8 }}
                                    />
                                </LineChart>
                            ) : selectedGraph === 'distribution' ? (
                                <BarChart data={distributionStats}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" strokeOpacity={0.2} />
                                    <XAxis dataKey="range" tick={{ fontSize: 12, fill: '#6b7280' }} />
                                    <YAxis allowDecimals={false} tick={{ fill: '#6b7280' }} />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend />
                                    <Bar dataKey="count" name="Students" fill="#8884d8">
                                        {distributionStats.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            ) : (
                                <BarChart data={dailyStats}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" strokeOpacity={0.2} />
                                    <XAxis
                                        dataKey="date"
                                        tick={{ fontSize: 12, fill: '#6b7280' }}
                                        tickFormatter={(val) => formatDate(val).substring(0, 5)}
                                    />
                                    <YAxis allowDecimals={false} tick={{ fill: '#6b7280' }} />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        content={({ active, payload, label }) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload;
                                                return (
                                                    <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 shadow-lg rounded-lg">
                                                        <p className="font-bold text-gray-900 dark:text-gray-100">{label}</p>
                                                        <p className="text-green-600 dark:text-green-400 font-semibold">
                                                            Present: {data.present}
                                                        </p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                            Total Class Strength: {data.total}
                                                        </p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Legend />
                                    <Bar dataKey="present" name="Students Present" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Low Attendance List */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-4 text-red-600 dark:text-red-400">Low Attendance Alert (&lt; 65%)</h3>
                    <div className="overflow-y-auto max-h-[300px] scrollbar-hide">
                        <table className="min-w-full">
                            <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Reg No</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Name</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">%</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {globalStudentStats.filter((s: any) => s.percent < 65).length === 0 ? (
                                    <tr><td colSpan={3} className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">No students below 65%</td></tr>
                                ) : (
                                    globalStudentStats.filter((s: any) => s.percent < 65).map((s: any) => (
                                        <tr key={s.regNo}>
                                            <td className="px-4 py-3 text-sm font-mono text-gray-600 dark:text-gray-300">{s.regNo}</td>
                                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 truncate max-w-[120px]">{s.name}</td>
                                            <td className="px-4 py-3 text-sm font-bold text-red-600 dark:text-red-400 text-right">{s.percent}%</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Detailed Student Report Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                            <FileSpreadsheet className="w-5 h-5 text-green-600" />
                            Detailed Student Report (CC/CA Matrix)
                        </h3>
                        <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider">
                            {selectedBranch} - {selectedYear} Year - Sem {selectedSemester} - Section {selectedSection}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <button
                                onClick={() => window.print()}
                                className="flex items-center gap-2 text-gray-600 dark:text-gray-300 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-2 rounded-lg transition-colors border border-gray-200 dark:border-gray-700"
                            >
                                <Printer className="w-4 h-4" />
                                Print
                            </button>
                            <button
                                onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                                className="flex items-center gap-2 text-primary-600 dark:text-primary-400 text-sm font-medium hover:bg-primary-50 dark:hover:bg-primary-900/30 px-3 py-2 rounded-lg transition-colors border border-primary-100 dark:border-primary-800"
                            >
                                <Download className="w-4 h-4" />
                                Export
                                <ChevronDown className="w-4 h-4" />
                            </button>

                            {showDownloadMenu && (
                                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-10 py-1">
                                    <button
                                        onClick={() => handleDownloadReport('pdf')}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center gap-2"
                                    >
                                        <FileText className="w-4 h-4 text-red-500" />
                                        PDF Document
                                    </button>
                                    {/* Excel/CSV logic would need update for matrix, keeping as is or disabling for now */}
                                    <button
                                        onClick={() => handleDownloadReport('excel')}
                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center gap-2"
                                    >
                                        <FileSpreadsheet className="w-4 h-4 text-green-600" />
                                        Excel Matrix
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto scrollbar-hide">
                    <table className="min-w-full text-xs border-collapse">
                        <thead>
                            <tr className="bg-gray-100 dark:bg-gray-900 border-b border-gray-300 dark:border-gray-700">
                                <th rowSpan={2} className="p-3 border-r min-w-[50px] sticky left-0 bg-gray-100 dark:bg-gray-900 z-20 text-center font-bold">S.No</th>
                                <th rowSpan={2} className="p-3 border-r min-w-[120px] sticky left-[50px] bg-gray-100 dark:bg-gray-900 z-20 text-left font-bold">Registration No</th>
                                <th rowSpan={2} className="p-3 border-r min-w-[200px] text-left font-bold bg-gray-50 dark:bg-gray-800">Student Name</th>

                                {matrixData.subjects.map((subj) => {
                                    const isAssignedToMe = subjectAssignments[subj]?.uid === currentUser?.uid;
                                    return (
                                        <th key={subj} colSpan={2} className={`p-2 border-r text-center font-bold ${isAssignedToMe ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 ring-2 ring-inset ring-purple-500' : 'bg-blue-50/50 dark:bg-blue-900/10 text-blue-800 dark:text-blue-300'} uppercase text-[10px] break-words max-w-[100px] transition-all`}>
                                            <div className="flex flex-col items-center gap-1">
                                                <span>{subj}</span>
                                                {isAssignedToMe && (
                                                    <span className="text-[7px] bg-purple-600 text-white px-1 rounded-full animate-pulse">YOU</span>
                                                )}
                                            </div>
                                        </th>
                                    );
                                })}

                                <th colSpan={2} className="p-2 border-r text-center font-bold bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 font-mono">TOTAL</th>
                                <th rowSpan={2} className="p-2 text-center text-red-600 font-bold bg-red-50 dark:bg-red-900/10">%</th>
                            </tr>
                            <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700 text-[10px]">
                                {matrixData.subjects.map((subj) => {
                                    const isAssignedToMe = subjectAssignments[subj]?.uid === currentUser?.uid;
                                    return (
                                        <React.Fragment key={`${subj}-sub`}>
                                            <th className={`p-1 border-r text-center w-10 text-gray-500 font-normal ${isAssignedToMe ? 'bg-purple-50 dark:bg-purple-900/20' : ''}`}>CC</th>
                                            <th className={`p-1 border-r text-center w-10 font-bold ${isAssignedToMe ? 'bg-purple-50 dark:bg-purple-900/20' : ''}`}>CA</th>
                                        </React.Fragment>
                                    );
                                })}
                                <th className="p-1 border-r text-center w-10 text-gray-500 bg-green-50/20">CC</th>
                                <th className="p-1 border-r text-center w-10 font-bold bg-green-50/20">CA</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {/* Conducting Totals Row */}
                            <tr className="bg-yellow-50/30 dark:bg-yellow-900/5 font-bold">
                                <td className="p-2 border-r sticky left-0 bg-yellow-50/30 dark:bg-yellow-900/5 z-10">-</td>
                                <td className="p-2 border-r sticky left-[50px] bg-yellow-50/30 dark:bg-yellow-900/5 z-10">-</td>
                                <td className="p-2 border-r italic text-gray-400">Conducting Totals (CC)</td>
                                {matrixData.subjects.map(subj => {
                                    const isAssignedToMe = subjectAssignments[subj]?.uid === currentUser?.uid;
                                    return (
                                        <React.Fragment key={`${subj}-cc-row`}>
                                            <td className={`p-2 border-r text-center text-blue-600 ${isAssignedToMe ? 'bg-purple-50 dark:bg-purple-900/20' : ''}`}>{matrixData.subjectCC[subj] || 0}</td>
                                            <td className={`p-2 border-r text-center text-gray-300 ${isAssignedToMe ? 'bg-purple-50 dark:bg-purple-900/20' : ''}`}>-</td>
                                        </React.Fragment>
                                    );
                                })}
                                <td className="p-2 border-r text-center text-green-700 bg-green-50/30">
                                    {Object.values(matrixData.subjectCC).reduce((a, b) => a + (b || 0), 0)}
                                </td>
                                <td className="p-2 border-r text-center text-gray-300 bg-green-50/30">-</td>
                                <td className="p-2 text-center text-gray-300">-</td>
                            </tr>

                            {globalStudentStats.map((student: any, idx: number) => {
                                let totalSCA = 0;
                                let totalSCC = 0;

                                return (
                                    <tr key={student.regNo} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="p-2 border-r text-center text-gray-400 sticky left-0 bg-white dark:bg-gray-800 z-10">{idx + 1}</td>
                                        <td className="p-2 border-r font-mono font-medium sticky left-[50px] bg-white dark:bg-gray-800 z-10">{student.regNo}</td>
                                        <td className="p-2 border-r truncate max-w-[200px] text-gray-900 dark:text-gray-100">{student.name}</td>

                                        {matrixData.subjects.map((subj) => {
                                            const cc = matrixData.subjectCC[subj] || 0;
                                            const ca = (matrixData.studentCA[student.regNo] && matrixData.studentCA[student.regNo][subj]) || 0;
                                            const isAssignedToMe = subjectAssignments[subj]?.uid === currentUser?.uid;

                                            totalSCC += cc;
                                            totalSCA += ca;

                                            const subPercent = cc > 0 ? (ca / cc) * 100 : 0;
                                            const colorClass = cc === 0 ? 'text-gray-300' : subPercent < 65 ? 'text-red-600 font-bold' : subPercent < 75 ? 'text-orange-500' : 'text-green-600';

                                            return (
                                                <React.Fragment key={`${student.regNo}-${subj}`}>
                                                    <td className={`p-2 border-r text-center text-gray-400 text-[10px] ${isAssignedToMe ? 'bg-purple-50/50 dark:bg-purple-900/10' : ''}`}>{cc}</td>
                                                    <td className={`p-2 border-r text-center font-bold ${colorClass} ${isAssignedToMe ? 'bg-purple-50/50 dark:bg-purple-900/10' : ''}`}>{ca}</td>
                                                </React.Fragment>
                                            );
                                        })}

                                        <td className="p-2 border-r text-center font-bold text-gray-700 dark:text-gray-400 bg-gray-50/50 dark:bg-gray-900/20">{totalSCC}</td>
                                        <td className="p-2 border-r text-center font-black text-gray-900 dark:text-white bg-gray-50/50 dark:bg-gray-900/20">{totalSCA}</td>
                                        <td className={`p-2 text-center font-bold ${(totalSCC > 0 ? (totalSCA / totalSCC) * 100 : 0) < 65 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                                            {totalSCC > 0 ? Math.round((totalSCA / totalSCC) * 100) : 0}%
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {globalStudentStats.length === 0 && (
                    <div className="p-12 text-center text-gray-500">
                        No student data available for the selected criteria.
                    </div>
                )}
            </div>
        </div>
    );
}
