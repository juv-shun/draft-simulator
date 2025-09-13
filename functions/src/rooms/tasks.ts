// Cloud Tasks 予約のスタブ。
// 本番では @google-cloud/tasks で HTTP タスクを予約し、onTurnTimeout を叩く。
import { processTurnTimeout } from './onTurnTimeout.js';

function isEmulator(): boolean {
  return Boolean(
    process.env.FUNCTIONS_EMULATOR === 'true' ||
      process.env.FIRESTORE_EMULATOR_HOST ||
      process.env.FIREBASE_AUTH_EMULATOR_HOST,
  );
}

// クライアント優先のため、サーバ側は猶予を設ける
const GRACE_MS = 2000; // 2秒余裕

export async function scheduleTurnTimeout(roomId: string, turnIndex: number, etaMs: number): Promise<void> {
  // Emulator: setTimeout + 直接処理
  if (isEmulator()) {
    const delay = Math.max(0, Math.min(120000, Math.floor(etaMs + GRACE_MS)));
    console.log('[emulator] scheduleTurnTimeout', { roomId, turnIndex, delay });
    setTimeout(async () => {
      try {
        const res = await processTurnTimeout(roomId, turnIndex);
        if (res.deadline > 0 && res.turnIndex > 0) {
          const nextDelay = Math.max(0, res.deadline - Date.now());
          await scheduleTurnTimeout(roomId, res.turnIndex, nextDelay);
        }
      } catch (e) {
        console.error('[emulator] onTurnTimeout failed:', e);
      }
    }, delay);
    return;
  }

  // TODO: 本番/CI では Cloud Tasks による HTTP タスク予約に置換
  console.log('[prod-stub] scheduleTurnTimeout', { roomId, turnIndex, etaMs: etaMs + GRACE_MS });
}
