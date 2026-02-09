'use client';

import { useState } from 'react';
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, firebaseConfig } from '@/lib/firebase/config';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { useRouter } from 'next/navigation';
import { ArrowLeft, UserPlus, LayoutDashboard, ShieldAlert } from 'lucide-react';
import { useAuth, ADMIN_EMAILS } from '@/context/AuthContext';

export default function RegisterFaculty() {
    const router = useRouter();
    const { currentUser, loading } = useAuth();
    const [formData, setFormData] = useState({
        name: '',
        facultyId: '',
        department: 'CSE',
        password: 'password123'
    });
    const [status, setStatus] = useState({ type: '', message: '' });
    const [isLoading, setIsLoading] = useState(false);

    // Initialize secondary app ONLY on client to avoid build errors
    // Use a secondary app instance to create users without logging out the current admin
    const getSecondaryAuth = () => {
        let secondaryApp;
        try {
            secondaryApp = getApp('Secondary');
        } catch (e) {
            secondaryApp = initializeApp(firebaseConfig, 'Secondary');
        }
        return getAuth(secondaryApp);
    };

    const departments = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT', 'CSM', 'CSD', 'MBA'];

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    // Access Control: Only specific emails allowed
    if (!currentUser || !ADMIN_EMAILS.includes(currentUser.email)) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 text-center">
                <ShieldAlert className="w-16 h-16 text-red-600 mb-4" />
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h1>
                <p className="text-gray-600 mb-6">You do not have permission to view this page.</p>
                <button
                    onClick={() => router.push('/login')}
                    className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition"
                >
                    Go to Login
                </button>
            </div>
        );
    }

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name || !formData.facultyId) {
            setStatus({ type: 'error', message: 'Please fill in all fields' });
            return;
        }

        setIsLoading(true);
        setStatus({ type: '', message: '' });

        const name = formData.name;
        const id = formData.facultyId.toUpperCase();
        const email = `${id}@aliet.ac.in`.toLowerCase();
        const password = formData.password;

        try {
            // 1. Create Auth User using Secondary Auth instance (prevents logout)
            const secondaryAuth = getSecondaryAuth();
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
            const user = userCredential.user;

            // 2. Create Firestore Profile (using main db instance is fine)
            // Use setDoc to create/overwrite user document
            await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                name: name,
                email: email,
                employeeId: id,
                role: 'faculty',
                createdAt: serverTimestamp(),
                department: formData.department,
                branch: formData.department
            });

            setStatus({
                type: 'success',
                message: `SUCCESS! Created faculty: ${name} (${id})\nLogin ID: ${id}`
            });

            // Clear form
            setFormData({ ...formData, name: '', facultyId: '' });

        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/email-already-in-use') {
                setStatus({ type: 'error', message: `User ID ${id} already exists! Try logging in.` });
            } else {
                setStatus({ type: 'error', message: 'Error: ' + err.message });
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-lg">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <UserPlus className="w-6 h-6 text-blue-600" />
                        Admin: Register Faculty
                    </h1>
                    <button
                        onClick={() => router.push('/dashboard/admin')}
                        className="text-sm text-gray-500 hover:text-blue-600 flex items-center gap-1"
                    >
                        <LayoutDashboard className="w-4 h-4" /> Dashboard
                    </button>
                </div>

                <div className="mb-6 bg-blue-50 p-3 rounded text-sm text-blue-800 border border-blue-200">
                    Logged in as Admin: <strong>{currentUser.email}</strong>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Faculty Name</label>
                        <input
                            type="text"
                            required
                            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="e.g. John Doe"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Faculty ID</label>
                        <input
                            type="text"
                            required
                            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                            placeholder="e.g. FAC-CSE-001"
                            value={formData.facultyId}
                            onChange={(e) => setFormData({ ...formData, facultyId: e.target.value })}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Generated Email: {((formData.facultyId || "example") + "@aliet.ac.in").toLowerCase()}
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                        <select
                            className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={formData.department}
                            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        >
                            {departments.map(dept => (
                                <option key={dept} value={dept}>{dept}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input
                            type="text"
                            className="w-full border p-2 rounded bg-gray-50 text-gray-600"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                    >
                        {isLoading ? 'Creating...' : 'Create Faculty Account'}
                    </button>
                </form>

                {status.type && (
                    <div className={`mt-6 p-4 rounded text-sm whitespace-pre-line ${status.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
                        }`}>
                        {status.message}
                    </div>
                )}

                <div className="mt-6 pt-4 border-t text-center">
                    <a href="/login" className="text-blue-500 hover:underline flex items-center justify-center gap-1">
                        <ArrowLeft className="w-4 h-4" /> Back to Login
                    </a>
                </div>
            </div>
        </div>
    );
}
