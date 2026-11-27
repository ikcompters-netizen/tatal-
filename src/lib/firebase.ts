import { initializeApp, getApps, deleteApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  onAuthStateChanged,
  type Auth,
  type User,
} from 'firebase/auth';
import { getAnalytics, isSupported as isAnalyticsSupported } from 'firebase/analytics';
import type { FirebaseConfig } from '../types';

export const DEFAULT_FIREBASE_CONFIG: FirebaseConfig = {
  apiKey: 'AIzaSyAkihoICrF7KyF-D0cH8JmhGgoe1rs0yuY',
  authDomain: 'tatal-8a14e.firebaseapp.com',
  projectId: 'tatal-8a14e',
  storageBucket: 'tatal-8a14e.firebasestorage.app',
  messagingSenderId: '703077657524',
  appId: '1:703077657524:web:07ba36aade3a4b2292e0e1',
  measurementId: 'G-Z4YWK2JGDJ',
};

let currentApp: FirebaseApp | null = null;
let currentAuth: Auth | null = null;
let activeConfigKey = '';

export function getEnvFirebaseConfig(): FirebaseConfig | null {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  if (!apiKey || !projectId) return null;
  return {
    apiKey,
    authDomain: authDomain || `${projectId}.firebaseapp.com`,
    projectId,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
  };
}

export function isValidFirebaseConfig(cfg?: FirebaseConfig | null): cfg is FirebaseConfig {
  return Boolean(cfg && cfg.apiKey?.trim() && cfg.projectId?.trim());
}

export async function initFirebaseAuth(serverConfig?: FirebaseConfig | null): Promise<Auth | null> {
  const envConfig = getEnvFirebaseConfig();
  const cfg = isValidFirebaseConfig(envConfig)
    ? envConfig
    : isValidFirebaseConfig(serverConfig)
    ? serverConfig
    : DEFAULT_FIREBASE_CONFIG;

  if (!isValidFirebaseConfig(cfg)) {
    currentAuth = null;
    return null;
  }

  const key = `${cfg.apiKey}:${cfg.projectId}`;
  if (currentAuth && activeConfigKey === key) {
    return currentAuth;
  }

  for (const app of getApps()) {
    await deleteApp(app);
  }

  currentApp = initializeApp(cfg);
  currentAuth = getAuth(currentApp);
  activeConfigKey = key;

  if (cfg.measurementId && typeof window !== 'undefined') {
    isAnalyticsSupported()
      .then((ok) => {
        if (ok && currentApp) getAnalytics(currentApp);
      })
      .catch(() => {});
  }

  return currentAuth;
}

export function getFirebaseAuthInstance(): Auth | null {
  return currentAuth;
}

export function subscribeFirebaseAuth(cb: (user: User | null) => void) {
  if (!currentAuth) return () => {};
  return onAuthStateChanged(currentAuth, cb);
}

export async function firebaseSignIn(email: string, password: string) {
  if (!currentAuth) throw new Error('Firebase is not configured yet.');
  return signInWithEmailAndPassword(currentAuth, email, password);
}

export async function firebaseRegister(email: string, password: string, displayName?: string) {
  if (!currentAuth) throw new Error('Firebase is not configured yet.');
  const cred = await createUserWithEmailAndPassword(currentAuth, email, password);
  if (displayName) {
    await updateProfile(cred.user, { displayName });
  }
  return cred;
}

export async function firebaseGoogleLogin() {
  if (!currentAuth) throw new Error('Firebase is not configured yet.');
  const provider = new GoogleAuthProvider();
  return signInWithPopup(currentAuth, provider);
}

export async function firebaseResetPassword(email: string) {
  if (!currentAuth) throw new Error('Firebase is not configured yet.');
  return sendPasswordResetEmail(currentAuth, email);
}

export async function firebaseLogout() {
  if (!currentAuth) return;
  return signOut(currentAuth);
}
