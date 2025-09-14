import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator, type Functions } from 'firebase/functions';

// Vite の環境変数
const {
  VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_AUTH_DOMAIN,
  VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_APP_ID,
  VITE_USE_EMULATORS,
} = import.meta.env as Record<string, string | undefined>;

const isDev = import.meta.env.DEV === true;

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let functionsIns: Functions | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (app) return app;
  // 開発環境では必ず Emulator を使用
  if (isDev && VITE_USE_EMULATORS !== 'true') {
    throw new Error(
      '開発環境では Emulator の使用が必須です。VITE_USE_EMULATORS=true を設定してください',
    );
  }
  if (!VITE_FIREBASE_API_KEY || !VITE_FIREBASE_PROJECT_ID) {
    throw new Error('Firebase 環境変数が未設定です。VITE_FIREBASE_* を設定してください');
  }
  app = initializeApp({
    apiKey: VITE_FIREBASE_API_KEY,
    authDomain: VITE_FIREBASE_AUTH_DOMAIN,
    projectId: VITE_FIREBASE_PROJECT_ID,
    appId: VITE_FIREBASE_APP_ID,
  });
  return app;
}

export function getFirebaseAuth(): Auth {
  if (auth) return auth;
  const appIns = getFirebaseApp();
  auth = getAuth(appIns);
  if (VITE_USE_EMULATORS === 'true') {
    // すでに接続済みでも二重接続しないように try-catch で握りつぶす
    try {
      connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    } catch {
      // noop
    }
  }
  return auth;
}

export function getFirestoreDb(): Firestore {
  if (db) return db;
  const appIns = getFirebaseApp();
  db = getFirestore(appIns);
  if (VITE_USE_EMULATORS === 'true') {
    try {
      connectFirestoreEmulator(db, 'localhost', 8080);
    } catch {
      // noop
    }
  }
  return db;
}

export function getFunctionsClient(): Functions {
  if (functionsIns) return functionsIns;
  const appIns = getFirebaseApp();
  const region = (import.meta.env.VITE_FUNCTIONS_REGION as string) || 'asia-northeast1';
  functionsIns = getFunctions(appIns, region);
  if (VITE_USE_EMULATORS === 'true') {
    try {
      connectFunctionsEmulator(functionsIns, 'localhost', 5001);
    } catch {
      // noop
    }
  }
  return functionsIns;
}
