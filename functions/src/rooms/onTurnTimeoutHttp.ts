import { onRequest } from 'firebase-functions/v2/https';
import { processTurnTimeout } from './onTurnTimeout.js';
import { scheduleTurnTimeout } from './tasks.js';

// Cloud Tasks から叩かれる HTTP 版（認証なし）
export const onTurnTimeoutHttp = onRequest({ region: 'asia-northeast1', cors: true }, async (req, res) => {
  try {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }
    const roomId = (req.body?.roomId ?? req.query?.roomId) as string | undefined;
    const turnIndex = Number(req.body?.turnIndex ?? req.query?.turnIndex);
    if (!roomId || !Number.isFinite(turnIndex)) {
      res.status(400).send('INVALID_ARGUMENT');
      return;
    }
    const result = await processTurnTimeout(roomId, turnIndex);
    if (result.deadline > 0 && result.turnIndex > 0) {
      const eta = Math.max(0, result.deadline - Date.now());
      try {
        await scheduleTurnTimeout(roomId, result.turnIndex, eta);
      } catch (e) {
        console.error('Failed to schedule next timeout:', e);
      }
    }
    res.status(200).json({ ok: true, deadline: result.deadline, turnIndex: result.turnIndex });
  } catch (e: any) {
    console.error('onTurnTimeoutHttp error:', e);
    res.status(500).send('INTERNAL');
  }
});

