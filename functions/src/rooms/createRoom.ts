import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db, serverTimestamp } from '../lib/firestore.js';
import type { RoomDoc } from '../types.js';


export const createRoom = onCall({
  cors: true,
  region: 'asia-northeast1',
}, async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'UNAUTHENTICATED');

  const turnSecondsRaw = req.data?.turnSeconds;
  const turnSeconds = typeof turnSecondsRaw === 'number' ? turnSecondsRaw : 15;
  if (!(turnSeconds >= 5 && turnSeconds <= 120)) {
    throw new HttpsError('invalid-argument', 'INVALID_TURN_SECONDS');
  }

  const doc: RoomDoc = {
    hostUid: uid,
    seats: { PURPLE: {}, ORANGE: {} },
    state: { phase: 'lobby' },
    config: { turnSeconds },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    version: 1,
  };

  const ref = await db.collection('rooms').add(doc as any);
  return { roomId: ref.id } as { roomId: string };
});
