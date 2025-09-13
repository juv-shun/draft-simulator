import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db, serverTimestamp } from '../lib/firestore.js';
import { scheduleTurnTimeout } from './tasks.js';
export const startDraft = onCall({
    cors: true,
    region: 'asia-northeast1',
}, async (req) => {
    const uid = req.auth?.uid;
    if (!uid)
        throw new HttpsError('unauthenticated', 'UNAUTHENTICATED');
    const { roomId } = req.data || {};
    if (!roomId)
        throw new HttpsError('invalid-argument', 'INVALID_ARGUMENT');
    const now = Date.now();
    let deadline = now;
    const turnIndex = 1;
    const ref = db.collection('rooms').doc(roomId);
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists)
            throw new HttpsError('not-found', 'ROOM_NOT_FOUND');
        const data = snap.data();
        if (data.hostUid !== uid)
            throw new HttpsError('permission-denied', 'NOT_HOST');
        const purpleUid = data?.seats?.PURPLE?.uid;
        const orangeUid = data?.seats?.ORANGE?.uid;
        if (!purpleUid || !orangeUid)
            throw new HttpsError('failed-precondition', 'SEATS_NOT_READY');
        if (data?.state?.phase && data.state.phase !== 'lobby') {
            throw new HttpsError('failed-precondition', 'ALREADY_STARTED');
        }
        const seconds = Number(data?.config?.turnSeconds ?? 15);
        deadline = now + Math.max(5, Math.min(120, seconds)) * 1000;
        tx.update(ref, {
            state: {
                phase: 'ban1',
                turnTeam: 'PURPLE',
                turnIndex,
                deadline,
                bans: { PURPLE: [], ORANGE: [] },
                picks: { PURPLE: [], ORANGE: [] },
                lastAction: null,
            },
            updatedAt: serverTimestamp(),
        });
    });
    // 初回ターンのタイムアウトを予約（猶予は schedule 側で付与）
    try {
        await scheduleTurnTimeout(roomId, turnIndex, deadline - now);
    }
    catch (e) {
        console.error('Failed to schedule timeout task:', e);
    }
    return { ok: true, deadline, turnIndex };
});
