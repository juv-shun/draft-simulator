import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// v12 以降は modular API を使用
if (getApps().length === 0) {
  initializeApp();
}

export const db = getFirestore();
export const serverTimestamp = FieldValue.serverTimestamp;
