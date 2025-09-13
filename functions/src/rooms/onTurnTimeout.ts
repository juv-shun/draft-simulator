import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db, serverTimestamp } from '../lib/firestore.js';
import type { Team } from '../types.js';
import { applyActionToState, expectedTurn, usedIds } from './engine.js';
import { scheduleTurnTimeout } from './tasks.js';

type TimeoutPayload = { roomId?: string; turnIndex?: number };

export async function processTurnTimeout(roomId: string, turnIndex: number): Promise<{ deadline: number; turnIndex: number }> {
  let nextDeadline = 0;
  let nextTurnIndex = 0;
  const ref = db.collection('rooms').doc(roomId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError('not-found', 'ROOM_NOT_FOUND');
    const data = snap.data() as any;
    const state = data?.state;
    if (!state || state.phase === 'lobby') return; // 未開始
    if (state.phase === 'finished' || state.phase === 'aborted') return; // 終了

    // ターン不一致や期限未到来は no-op
    if (typeof state.turnIndex !== 'number' || state.turnIndex !== turnIndex) return;
    const now = Date.now();
    if (typeof state.deadline === 'number' && state.deadline > now) return;

    const exp = expectedTurn(state);
    if (!exp) return;

    const team: Team = exp.team;
    const count = exp.count;

    // 使用済みを除いた候補からランダム
    const pool = getAllowedPool(state);
    const used = usedIds(state);
    const candidates = pool.filter((id) => !used.has(id));
    if (candidates.length === 0) return;
    const pick: string[] = [];
    while (pick.length < count && candidates.length > 0) {
      const i = Math.floor(Math.random() * candidates.length);
      pick.push(candidates.splice(i, 1)[0]);
    }
    if (pick.length !== count) return;

    const seconds = Number(data?.config?.turnSeconds ?? 15);
    const result = applyActionToState(state, team, exp.kind, pick, seconds, now);
    const nextState = result.nextState as any;
    nextDeadline = nextState.deadline ?? 0;
    nextTurnIndex = nextState.turnIndex ?? 0;
    tx.update(ref, { state: nextState, updatedAt: serverTimestamp() });
  });
  return { deadline: nextDeadline, turnIndex: nextTurnIndex };
}

// サーバ側タイムアウト処理（Cloud Tasks からの呼び出し想定）
export const onTurnTimeout = onCall({ cors: true, region: 'us-central1' }, async (req) => {
  const { roomId, turnIndex } = (req.data || {}) as TimeoutPayload;
  if (!roomId || typeof turnIndex !== 'number') {
    throw new HttpsError('invalid-argument', 'INVALID_ARGUMENT');
  }
  const res = await processTurnTimeout(roomId, turnIndex);
  if (res.deadline > 0 && res.turnIndex > 0) {
    try {
      const eta = Math.max(0, res.deadline - Date.now());
      await scheduleTurnTimeout(roomId, res.turnIndex, eta);
    } catch (e) {
      console.error('Failed to schedule timeout task (onTurnTimeout):', e);
    }
  }
  return { ok: true as const, deadline: res.deadline, turnIndex: res.turnIndex } as {
    ok: true;
    deadline: number;
    turnIndex: number;
  };
});

// 暫定の許可プール（最小セット）。後続で pokemons.json を統合予定。
const ALLOW_LIST_MIN = [
  'pikachu',
  'venusaur',
  'mew',
  'mewtwo-y',
  'espeon',
  'gardevoir',
  'chandelure',
  'greninja',
  'sylveon',
  'glaceon',
  'alolan-ninetales',
  'decidueye',
  'cramorant',
  'cinderace',
  'dragapult',
  'duraludon',
];

function getAllowedPool(_state: any): string[] {
  return ALLOW_LIST_MIN;
}
