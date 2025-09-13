// Cloud Tasks 予約のスタブ。
// 本番では @google-cloud/tasks で HTTP タスクを予約し、onTurnTimeout を叩く。
export async function scheduleTurnTimeout(
  _roomId: string,
  _turnIndex: number,
  _etaMs: number,
): Promise<void> {
  // TODO: 本番/CI で Cloud Tasks を使って予約する。
  // Emulator では直接 onTurnTimeout を手動呼び出しで代替。
  console.log('scheduleTurnTimeout(stub):', { _roomId, _turnIndex, _etaMs });
}

