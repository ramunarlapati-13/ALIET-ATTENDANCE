'use client';

import { useEffect, useState } from 'react';

export default function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        const handler = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowPrompt(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();

        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
        } else {
            console.log('User dismissed the install prompt');
        }

        setDeferredPrompt(null);
        setShowPrompt(false);
    };

    if (!showPrompt) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 z-50 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 flex flex-col gap-3 animate-in slide-in-from-bottom duration-300 max-w-sm">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Install App</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        Install this application on your device for quick access and offline use.
                    </p>
                </div>
                <button
                    onClick={() => setShowPrompt(false)}
                    className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 p-1"
                >
                    ✕
                </button>
            </div>
            <div className="flex gap-2 mt-2">
                <button
                    onClick={handleInstallClick}
                    className="flex-1 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
                >
                    Install Now
                </button>
                <button
                    onClick={() => setShowPrompt(false)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium py-2 px-4 rounded-lg transition-colors"
                >
                    Maybe Later
                </button>
            </div>
        </div>
    );
}
