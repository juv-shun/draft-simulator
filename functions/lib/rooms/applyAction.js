import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db, serverTimestamp } from '../lib/firestore.js';
import { applyActionToState } from './engine.js';
import { scheduleTurnTimeout } from './tasks.js';
export const applyAction = onCall({ cors: true, region: 'us-central1' }, async (req) => {
    const uid = req.auth?.uid;
    if (!uid)
        throw new HttpsError('unauthenticated', 'UNAUTHENTICATED');
    const { roomId, action } = (req.data || {});
    if (!roomId || !action || (action.kind !== 'ban' && action.kind !== 'pick') || !Array.isArray(action.ids)) {
        throw new HttpsError('invalid-argument', 'INVALID_ARGUMENT');
    }
    // この時点で action は妥当検証済み。コールバック越しでも型が狭まるようにローカルへ固定。
    const act = { kind: action.kind, ids: action.ids };
    let nextDeadline = 0;
    let nextTurnIndex = 0;
    const ref = db.collection('rooms').doc(roomId);
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists)
            throw new HttpsError('not-found', 'ROOM_NOT_FOUND');
        const data = snap.data();
        const team = data?.seats?.PURPLE?.uid === uid ? 'PURPLE' : data?.seats?.ORANGE?.uid === uid ? 'ORANGE' : null;
        if (!team)
            throw new HttpsError('permission-denied', 'NOT_SEATED');
        const state = data?.state;
        if (!state || !state.phase || state.phase === 'lobby')
            throw new HttpsError('failed-precondition', 'NOT_STARTED');
        if (state.phase === 'finished' || state.phase === 'aborted')
            throw new HttpsError('failed-precondition', 'ALREADY_OVER');
        // 期待ターンと整合性の軽いチェック（チーム違いを早期検出）
        if (state.turnTeam && state.turnTeam !== team) {
            throw new HttpsError('permission-denied', 'NOT_YOUR_TURN');
        }
        const seconds = Number(data?.config?.turnSeconds ?? 15);
        const now = Date.now();
        try {
            const result = applyActionToState(state, team, act.kind, act.ids, seconds, now);
            const nextState = result.nextState;
            nextDeadline = nextState.deadline ?? 0;
            nextTurnIndex = nextState.turnIndex ?? 0;
            tx.update(ref, {
                state: nextState,
                updatedAt: serverTimestamp(),
            });
        }
        catch (e) {
            const code = toHttpsErrorCode(e?.message);
            throw new HttpsError(code, e?.message || 'INVALID_ACTION');
        }
    });
    // 次ターンが存在する場合はタイムアウトを再予約（猶予は schedule 側で加算）
    if (nextDeadline > 0 && nextTurnIndex > 0) {
        try {
            const eta = Math.max(0, nextDeadline - Date.now());
            await scheduleTurnTimeout(roomId, nextTurnIndex, eta);
        }
        catch (e) {
            console.error('Failed to schedule timeout task (applyAction):', e);
        }
    }
    return { ok: true, deadline: nextDeadline, turnIndex: nextTurnIndex };
});
function toHttpsErrorCode(msg) {
    switch (msg) {
        case 'NOT_IN_PROGRESS':
        case 'INVALID_PHASE':
            return 'failed-precondition';
        case 'NOT_YOUR_TURN':
        case 'WRONG_ACTION_KIND':
            return 'permission-denied';
        case 'INVALID_IDS_LENGTH':
        case 'EMPTY_ID':
        case 'DUPLICATE_IDS':
            return 'invalid-argument';
        case 'ALREADY_USED':
            return 'failed-precondition';
        default:
            return 'invalid-argument';
    }
}
