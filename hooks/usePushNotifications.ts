import { useState, useEffect } from 'react';
import {
    db,
    doc,
    updateDoc,
    arrayUnion,
    setDoc,
    getDoc,
    getMessaging,
    getToken,
    onMessage
} from '@/lib/firebase/config';
import { useAuth } from '@/context/AuthContext';

export const usePushNotifications = () => {
    const { currentUser } = useAuth();
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [fcmToken, setFcmToken] = useState<string | null>(null);
    const [isSupported, setIsSupported] = useState(false);

    useEffect(() => {
        if ('Notification' in window && 'serviceWorker' in navigator) {
            setIsSupported(true);
            setPermission(Notification.permission);
        }
    }, []);

    const requestPermission = async () => {
        if (!isSupported) {
            alert('Your browser does not support push notifications.');
            return;
        }

        try {
            const permissionResult = await Notification.requestPermission();
            setPermission(permissionResult);

            if (permissionResult === 'granted') {
                await generateToken();
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
        }
    };

    const generateToken = async () => {
        if (!currentUser) return;

        try {
            // messaging is initialized in config.ts, but we can also use getMessaging()
            const messaging = getMessaging();

            // Get VAPID Key from environment or hardcode
            // Ideally, pass { vapidKey: 'YOUR_PUBLIC_VAPID_KEY' }
            const currentToken = await getToken(messaging, {
                vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY // Add this to env
            });

            if (currentToken) {
                setFcmToken(currentToken);
                await saveTokenToDatabase(currentToken);
            } else {
                console.log('No registration token available. Request permission to generate one.');
            }
        } catch (err) {
            console.error('An error occurred while retrieving token. ', err);
        }
    };

    const saveTokenToDatabase = async (token: string) => {
        if (!currentUser?.uid) return;

        const userRef = doc(db, 'users', currentUser.uid);

        // Use arrayUnion to add token to array without duplicates
        await setDoc(userRef, {
            fcmTokens: arrayUnion(token),
            lastTokenUpdate: new Date()
        }, { merge: true });

        // Also save to branch-specific collection for easier targeting by admins
        if (currentUser) {
            const tokenRef = doc(db, 'admin', 'notifications', 'tokens', token);
            await setDoc(tokenRef, {
                token,
                uid: currentUser.uid,
                role: currentUser.role || 'unknown',
                branch: currentUser.branch || 'GENERAL',
                year: currentUser.year || 0,
                section: currentUser.section || '',
                updatedAt: new Date()
            }, { merge: true });
        }
    };

    // Foreground listener
    useEffect(() => {
        if (permission === 'granted') {
            const messagingValue = getMessaging();
            onMessage(messagingValue, (payload: any) => {
                console.log('Message received. ', payload);
                // Standard browser notification for foreground if not focused, or just as a fallback
                const { title, body, image } = payload.notification || {};
                if (title) {
                    // Ask the browser to show a notification even if in foreground
                    new Notification(title, {
                        body,
                        icon: '/logo.png',
                    });
                }
            });
        }
    }, [permission]);

    return {
        permission,
        requestPermission,
        fcmToken,
        isSupported
    };
};
