import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import {
  getAuth,
  GoogleAuthProvider,
  RecaptchaVerifier,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  signOut
} from 'firebase/auth';
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
export const auth = getAuth(firebaseApp);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Kept off by default so scraper-37c72 stays 100% on the free Firebase Spark plan ($0, no card needed).
export const PHONE_AUTH_ENABLED = import.meta.env.VITE_FIREBASE_PHONE_AUTH === '1';

export function setupRecaptcha(elementId) {
  if (!PHONE_AUTH_ENABLED) {
    throw new Error('Phone SMS authentication is disabled on the free Spark plan.');
  }
  return new RecaptchaVerifier(auth, elementId, { size: 'invisible' });
}

export async function signInWithGooglePopup() {
  const cred = await signInWithPopup(auth, googleProvider);
  const idToken = await cred.user.getIdToken();
  return { user: cred.user, idToken };
}

export async function signUpWithEmail({ name, email, password }) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (name) {
    try {
      await updateProfile(cred.user, { displayName: name });
    } catch {
      /* non-fatal */
    }
  }
  const idToken = await cred.user.getIdToken(true);
  return { user: cred.user, idToken };
}

export async function signInWithEmail(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  const idToken = await cred.user.getIdToken();
  return { user: cred.user, idToken };
}

export async function sendResetEmail(email) {
  await sendPasswordResetEmail(auth, email);
  return { success: true };
}

export async function firebaseLogout() {
  try {
    await signOut(auth);
  } catch {
    /* ignore */
  }
}

export const analyticsPromise =
  typeof window !== 'undefined' && !IS_DESKTOP
    ? isSupported()
        .then((supported) => (supported ? getAnalytics(firebaseApp) : null))
        .catch(() => null)
    : Promise.resolve(null);
