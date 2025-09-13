import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db, serverTimestamp } from '../lib/firestore.js';
import type { Team } from '../types.js';


export const claimSeat = onCall({
  cors: true,
  region: 'asia-northeast1',
}, async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'UNAUTHENTICATED');
  const { roomId, team, displayName } = req.data || ({} as any);
  if (!roomId || (team !== 'PURPLE' && team !== 'ORANGE'))
    throw new HttpsError('invalid-argument', 'INVALID_ARGUMENT');
  const name = String(displayName ?? '').trim();
  if (!name) throw new HttpsError('failed-precondition', 'EMPTY_DISPLAY_NAME');

  const ref = db.collection('rooms').doc(roomId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError('not-found', 'ROOM_NOT_FOUND');
    const data = snap.data() as any;
    const other: Team = team === 'PURPLE' ? 'ORANGE' : 'PURPLE';
    const otherUid = data?.seats?.[other]?.uid;
    if (otherUid && otherUid === uid) throw new HttpsError('failed-precondition', 'SAME_USER_BOTH_SEATS');
    const seat = data?.seats?.[team] ?? {};
    if (seat.uid) throw new HttpsError('failed-precondition', 'ALREADY_OCCUPIED');

    tx.update(ref, {
      [`seats.${team}.uid`]: uid,
      [`seats.${team}.displayName`]: name,
      updatedAt: serverTimestamp(),
    });
  });
  return { ok: true as const };
});
