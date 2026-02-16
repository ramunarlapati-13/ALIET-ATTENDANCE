import { initializeApp, getApps, getApp } from 'firebase/app';
import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    setPersistence,
    browserLocalPersistence,
    updateEmail,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider,
    verifyBeforeUpdateEmail,
    type User as FirebaseUser,
    type UserCredential
} from 'firebase/auth';
import {
    getFirestore,
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    serverTimestamp,
    addDoc,
    Timestamp,
    increment,
    collectionGroup,
    arrayUnion,
    type Unsubscribe
} from 'firebase/firestore';
import {
    getDatabase,
    ref,
    set as setDb,
    push as pushDb,
    onValue,
    get as getDb,
    update as updateDb,
    remove as removeDb
} from 'firebase/database';
import { getStorage } from 'firebase/storage';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize services
const auth = getAuth(app);
const db = getFirestore(app);
const realtimeDb = getDatabase(app);
const storage = getStorage(app);

// Initialize Messaging (Client-Side Only)
let messaging: any = null;
if (typeof window !== 'undefined') {
    import('firebase/messaging').then((module) => {
        try {
            messaging = module.getMessaging(app);
        } catch (e) {
            console.error('Firebase Messaging failed to initialize', e);
        }
    });
}

// Initialize Analytics (only on client side)
let analytics: any = null;
if (typeof window !== 'undefined') {
    import('firebase/analytics').then((module) => {
        analytics = module.getAnalytics(app);
    });
}

export {
    app,
    auth,
    db,
    realtimeDb,
    storage,
    messaging,
    analytics,
    firebaseConfig,
    // App functions
    initializeApp,
    getApps,
    getApp,
    // Auth functions
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    setPersistence,
    browserLocalPersistence,
    updateEmail,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider,
    verifyBeforeUpdateEmail,
    // Firestore functions
    getFirestore,
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    serverTimestamp,
    addDoc,
    Timestamp,
    increment,
    collectionGroup,
    arrayUnion,
    // Database functions
    ref,
    setDb,
    pushDb,
    onValue,
    getDb,
    updateDb,
    removeDb,
    // Messaging functions
    getMessaging,
    getToken,
    onMessage
};

export type {
    FirebaseUser,
    UserCredential,
    Unsubscribe
};

export default app;
