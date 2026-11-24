import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { IS_DESKTOP } from './desktop';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyA6Jq-yQsqcTslMGQrgGdV7ChqFXAr7z3g',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'scraper-37c72.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'scraper-37c72',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'scraper-37c72.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '408929028308',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:408929028308:web:fe3a4a5409cd1f1db5d341',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-CJ2Y9NMJN0',
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const analyticsPromise =
  typeof window !== 'undefined' && !IS_DESKTOP
    ? isSupported()
        .then((supported) => (supported ? getAnalytics(firebaseApp) : null))
        .catch(() => null)
    : Promise.resolve(null);
