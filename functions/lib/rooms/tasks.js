// Cloud Tasks 予約のスタブ。
// 本番では @google-cloud/tasks で HTTP タスクを予約し、onTurnTimeout を叩く。
import { processTurnTimeout } from './onTurnTimeout.js';
import { CloudTasksClient } from '@google-cloud/tasks';
function isEmulator() {
    return Boolean(process.env.FUNCTIONS_EMULATOR === 'true' ||
        process.env.FIRESTORE_EMULATOR_HOST ||
        process.env.FIREBASE_AUTH_EMULATOR_HOST);
}
// クライアント優先のため、サーバ側は猶予を設ける
const GRACE_MS = 2000; // 2秒余裕
const LOCATION = 'asia-northeast1';
const QUEUE_ID = process.env.TASKS_QUEUE_ID || 'draft-timeouts';
export async function scheduleTurnTimeout(roomId, turnIndex, etaMs) {
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
            }
            catch (e) {
                console.error('[emulator] onTurnTimeout failed:', e);
            }
        }, delay);
        return;
    }
    const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
    if (!projectId) {
        console.warn('[prod] scheduleTurnTimeout: missing projectId');
        return;
    }
    const client = new CloudTasksClient();
    const parent = client.queuePath(projectId, LOCATION, QUEUE_ID);
    const targetUrl = `https://${LOCATION}-${projectId}.cloudfunctions.net/onTurnTimeoutHttp`;
    const scheduleSeconds = Math.floor(Date.now() / 1000) + Math.max(1, Math.ceil((etaMs + GRACE_MS) / 1000));
    const payload = Buffer.from(JSON.stringify({ roomId, turnIndex })).toString('base64');
    const task = {
        httpRequest: {
            httpMethod: 'POST',
            url: targetUrl,
            headers: { 'Content-Type': 'application/json' },
            body: payload,
        },
        scheduleTime: { seconds: scheduleSeconds },
    };
    try {
        const [resp] = await client.createTask({ parent, task: task });
        console.log('[prod] task scheduled', resp.name || '(no name)');
    }
    catch (e) {
        console.error('[prod] createTask failed', e);
    }
}
