import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db, serverTimestamp } from '../lib/firestore.js';
import type { Team } from '../types.js';
import { applyActionToState, expectedTurn, usedIds } from './engine.js';

type TimeoutPayload = { roomId?: string; turnIndex?: number };

// サーバ側タイムアウト処理（Cloud Tasks からの呼び出し想定）
export const onTurnTimeout = onCall({ cors: true, region: 'us-central1' }, async (req) => {
  const { roomId, turnIndex } = (req.data || {}) as TimeoutPayload;
  if (!roomId || typeof turnIndex !== 'number') {
    throw new HttpsError('invalid-argument', 'INVALID_ARGUMENT');
  }

  let nextDeadline = 0;
  let nextTurnIndex = 0;

  const ref = db.collection('rooms').doc(roomId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError('not-found', 'ROOM_NOT_FOUND');
    const data = snap.data() as any;
    const state = data?.state;
    if (!state || state.phase === 'lobby') return; // まだ開始していない
    if (state.phase === 'finished' || state.phase === 'aborted') return; // 終了済み

    // 既に別ターンに進んでいる/ズレている場合は冪等に no-op
    if (typeof state.turnIndex !== 'number' || state.turnIndex !== turnIndex) return;

    const now = Date.now();
    // 期限未到来なら実行しない（安全側）
    if (typeof state.deadline === 'number' && state.deadline > now) return;

    const exp = expectedTurn(state);
    if (!exp) {
      // もう終わっている
      return;
    }

    const team: Team = exp.team;
    const count = exp.count;

    // 使用済みを除いた候補からランダム選出
    const pool = getAllowedPool(state);
    const used = usedIds(state);
    const candidates = pool.filter((id) => !used.has(id));
    if (candidates.length === 0) return; // 候補が無ければ何もしない

    const pick: string[] = [];
    // シンプルなランダム選出（重複なし）
    while (pick.length < count && candidates.length > 0) {
      const i = Math.floor(Math.random() * candidates.length);
      pick.push(candidates.splice(i, 1)[0]);
    }
    if (pick.length !== count) return; // 足りなければ無理に進めない

    const seconds = Number(data?.config?.turnSeconds ?? 15);
    const result = applyActionToState(state, team, exp.kind, pick, seconds, now);
    const nextState = result.nextState as any;
    nextDeadline = nextState.deadline ?? 0;
    nextTurnIndex = nextState.turnIndex ?? 0;

    tx.update(ref, { state: nextState, updatedAt: serverTimestamp() });
  });

  return { ok: true as const, deadline: nextDeadline, turnIndex: nextTurnIndex } as {
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

