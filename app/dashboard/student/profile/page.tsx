'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider, verifyBeforeUpdateEmail } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import { User, Mail, Lock, Shield, ArrowLeft, Building2, Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function StudentProfilePage() {
    const { currentUser, firebaseUser, signOut } = useAuth();
    const router = useRouter();

    // Form States
    const [newEmail, setNewEmail] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // UI States
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [activeTab, setActiveTab] = useState<'details' | 'security'>('details');

    const handleUpdateEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firebaseUser || !newEmail) return;

        setLoading(true);
        setMessage({ type: '', text: '' });

        const performUpdate = async () => {
            // 1. Update Auth Email Directly (Verification removed as requested)
            await updateEmail(firebaseUser, newEmail);

            // 2. Update Firestore immediately ensures data consistency
            await updateDoc(doc(db, 'users', firebaseUser.uid), { email: newEmail });

            // 3. Update Admin collection explicitly here too
            if (currentUser?.role === 'student' && currentUser?.branch) {
                try {
                    await updateDoc(doc(db, 'admin', 'students', currentUser.branch, firebaseUser.uid), { email: newEmail });
                } catch (e) { console.error("Admin sync failed", e); }
            }

            setMessage({ type: 'success', text: 'Email updated successfully. Redirecting...' });

            // Sign out to force re-login with new credentials
            setTimeout(async () => {
                await signOut();
                router.push('/login');
            }, 1000);
        };

        try {
            await performUpdate();
        } catch (error: any) {
            console.error(error);
            if (error.code === 'auth/requires-recent-login') {
                // Try to auto-reauthenticate with Registration Number (default password)
                try {
                    if (currentUser?.registrationNumber && firebaseUser.email) {
                        const credential = EmailAuthProvider.credential(firebaseUser.email, currentUser.registrationNumber);
                        await reauthenticateWithCredential(firebaseUser, credential);
                        await performUpdate();
                    } else {
                        throw new Error("Cannot re-authenticate automatically.");
                    }
                } catch (reauthErr) {
                    setMessage({ type: 'error', text: 'Please sign out and sign in again to update sensitive information.' });
                }
            } else {
                setMessage({ type: 'error', text: error.message || 'Failed to update email.' });
            }
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firebaseUser) return;

        // Validation
        if (!currentPassword) {
            setMessage({ type: 'error', text: 'Please enter your current password.' });
            return;
        }

        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'New passwords do not match.' });
            return;
        }

        if (newPassword.length < 6) {
            setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
            return;
        }

        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            // 1. Re-authenticate ID check
            if (firebaseUser.email) {
                const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
                await reauthenticateWithCredential(firebaseUser, credential);
            }

            // 2. Update Password
            await updatePassword(firebaseUser, newPassword);

            // 3. Success
            setMessage({ type: 'success', text: 'Password updated successfully. Please sign in again.' });

            // 4. Sign Out
            setTimeout(async () => {
                await signOut();
                router.push('/login');
            }, 1000);

        } catch (error: any) {
            console.error(error);
            if (error.code === 'auth/wrong-password') {
                setMessage({ type: 'error', text: 'Incorrect current password.' });
            } else if (error.code === 'auth/requires-recent-login') {
                setMessage({ type: 'error', text: 'Session expired. Please sign in again.' });
            } else {
                setMessage({ type: 'error', text: error.message || 'Failed to update password.' });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <ProtectedRoute allowedRoles={['student']}>
            <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl mx-auto">

                    {/* Header */}
                    <div className="flex items-center gap-4 mb-8">
                        <button
                            onClick={() => router.back()}
                            className="p-2 hover:bg-white rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-6 h-6 text-gray-600" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Student Profile</h1>
                            <p className="text-gray-600">Manage your account settings</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                        {/* Sidebar Navigation (Desktop) / Tabs (Mobile) */}
                        <div className="md:col-span-1 space-y-2">
                            <button
                                onClick={() => setActiveTab('details')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${activeTab === 'details'
                                    ? 'bg-white shadow-sm text-primary-600 ring-1 ring-primary-100'
                                    : 'text-gray-600 hover:bg-white/50'
                                    }`}
                            >
                                <User className="w-5 h-5" />
                                <span className="font-medium">My Details</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('security')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${activeTab === 'security'
                                    ? 'bg-white shadow-sm text-primary-600 ring-1 ring-primary-100'
                                    : 'text-gray-600 hover:bg-white/50'
                                    }`}
                            >
                                <Shield className="w-5 h-5" />
                                <span className="font-medium">Security</span>
                            </button>
                        </div>

                        {/* Content Area */}
                        <div className="md:col-span-2 space-y-6">

                            {/* Alert Messages */}
                            {message.text && (
                                <div className={`p-4 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                                    }`}>
                                    {message.text}
                                </div>
                            )}

                            {/* DETAILS TAB */}
                            {activeTab === 'details' && (
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                    <div className="p-6 border-b border-gray-100">
                                        <h2 className="text-lg font-semibold text-gray-900">Academic Information</h2>
                                    </div>
                                    <div className="p-6 space-y-6">
                                        <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
                                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xl">
                                                {currentUser?.name?.[0]}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900">{currentUser?.name}</h3>
                                                <p className="text-sm text-blue-700 font-medium">{currentUser?.registrationNumber}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Branch</label>
                                                <div className="flex items-center gap-2 text-gray-900 font-medium">
                                                    <Building2 className="w-4 h-4 text-gray-400" />
                                                    {currentUser?.branch || 'N/A'}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Year</label>
                                                <div className="text-gray-900 font-medium">
                                                    {currentUser?.year || 'N/A'}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Section</label>
                                                <div className="text-gray-900 font-medium">
                                                    {currentUser?.section || 'N/A'}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Joined</label>
                                                <div className="text-gray-900 font-medium">
                                                    {currentUser?.registrationNumber
                                                        ? `20${currentUser.registrationNumber.substring(0, 2)}`
                                                        : (currentUser?.createdAt?.toDate
                                                            ? currentUser.createdAt.toDate().getFullYear()
                                                            : 'N/A')}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* SECURITY TAB */}
                            {activeTab === 'security' && (
                                <div className="space-y-6">



                                    {/* Change Password */}
                                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                        <div className="p-6 border-b border-gray-100">
                                            <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
                                            <p className="text-sm text-gray-500">Ensure your account is secure with a strong password.</p>
                                        </div>
                                        <div className="p-6">
                                            <form onSubmit={handleChangePassword} className="space-y-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                                                    <div className="relative">
                                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                        <input
                                                            type={showCurrentPassword ? 'text' : 'password'}
                                                            required
                                                            value={currentPassword}
                                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                                            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                                            placeholder="Current password"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                        >
                                                            {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                        </button>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                                                    <div className="relative">
                                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                        <input
                                                            type={showPassword ? 'text' : 'password'}
                                                            required
                                                            minLength={6}
                                                            value={newPassword}
                                                            onChange={(e) => setNewPassword(e.target.value)}
                                                            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                                            placeholder="New password"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowPassword(!showPassword)}
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                        >
                                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                        </button>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                                                    <div className="relative">
                                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                                        <input
                                                            type={showConfirmPassword ? 'text' : 'password'}
                                                            required
                                                            minLength={6}
                                                            value={confirmPassword}
                                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                                            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                                            placeholder="Confirm new password"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                        >
                                                            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                        </button>
                                                    </div>
                                                </div>
                                                <button
                                                    type="submit"
                                                    disabled={loading || !newPassword}
                                                    className="btn-primary py-2 px-4 text-sm disabled:opacity-50"
                                                >
                                                    {loading ? 'Updating...' : 'Change Password'}
                                                </button>
                                            </form>
                                        </div>
                                    </div>

                                </div>
                            )}

                        </div>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
