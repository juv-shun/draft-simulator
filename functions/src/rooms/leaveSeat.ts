import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db, serverTimestamp } from '../lib/firestore.js';
import type { Team } from '../types.js';

// 離席: 呼び出しユーザーが着席している席のみ離席可能
export const leaveSeat = onCall({
  cors: true,
  region: 'asia-northeast1',
}, async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'UNAUTHENTICATED');
  const { roomId, team } = (req.data || {}) as { roomId?: string; team?: Team };
  if (!roomId || (team !== 'PURPLE' && team !== 'ORANGE'))
    throw new HttpsError('invalid-argument', 'INVALID_ARGUMENT');

  const ref = db.collection('rooms').doc(roomId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError('not-found', 'ROOM_NOT_FOUND');
    const data = snap.data() as any;
    const hostUid = data?.hostUid as string | undefined;
    const seat = data?.seats?.[team] ?? {};
    if (!seat.uid) return; // 既に空席なら何もしない（冪等）
    // ホストは任意席を離席させ可能／それ以外は自分の席のみ
    if (seat.uid !== uid && uid !== hostUid) throw new HttpsError('permission-denied', 'NOT_ALLOWED');
    tx.update(ref, {
      [`seats.${team}.uid`]: null,
      // displayName は保持（モックと同等挙動）
      updatedAt: serverTimestamp(),
    });
  });
  return { ok: true as const };
});
