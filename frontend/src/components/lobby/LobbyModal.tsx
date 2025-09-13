import { apiClaimSeat, apiCreateRoom, apiLeaveSeat, apiStartDraft } from '@/api/firebaseFunctions';
import { useAnonAuth } from '@/auth/useAnonAuth';
import CopyToClipboardButton from '@/components/common/CopyToClipboardButton';
import type { RoomMock, SeatMock } from '@/lobby/types';
import { useLobbyMock } from '@/lobby/useLobbyMock';
import { useLobbyRemote } from '@/lobby/useLobbyRemote';
import React from 'react';
import LobbySeatCard from './LobbySeatCard';

type Props = {
  open: boolean;
  onStartDraft: () => void;
};

const Overlay: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
    <div className="relative z-10 w-full max-w-4xl p-4">{children}</div>
  </div>
);

function buildRoomUrl(room: RoomMock): string {
  const base =
    typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
  const query = `?mode=2p&roomId=${encodeURIComponent(room.id)}`;
  return `${base}${query}`;
}

function getRoomIdFromLocation(): string | null {
  if (typeof window === 'undefined') return null;
  const q = new URLSearchParams(window.location.search);
  return q.get('roomId');
}

const LobbyModal: React.FC<Props> = ({ open, onStartDraft }) => {
  // 切替条件: フラグ + URL の roomId
  const isFirebaseEnabled = (import.meta.env.VITE_FIREBASE_ENABLED as string) === 'true';
  const devClientWrites = (import.meta.env.VITE_DEV_CLIENT_WRITES as string) === 'true';
  const [roomId, setRoomId] = React.useState<string | null>(getRoomIdFromLocation());
  React.useEffect(() => {
    // モーダルが開くタイミングで URL を確認
    if (open) setRoomId(getRoomIdFromLocation());
  }, [open]);
  const remoteMode = open && isFirebaseEnabled && Boolean(roomId);

  // Remote: 匿名Auth + Firestore購読（読み取りのみ）
  const { uid, loading: authLoading, error: authError } = useAnonAuth(isFirebaseEnabled);
  const {
    room: remoteRoom,
    loading: roomLoading,
    error: roomError,
    createRoomDev,
    claimSeatDev,
    leaveSeatDev,
    setDisplayNameDev,
    devWritesEnabled,
  } = useLobbyRemote(remoteMode ? roomId : null);

  // 楽観的更新: Functions 応答を待たずに自分の座席変更を即時反映
  const [optimistic, setOptimistic] = React.useState<{ purple?: SeatMock; orange?: SeatMock }>({});
  const roomForView = React.useMemo<RoomMock | null>(() => {
    if (!remoteRoom) return null;
    if (!optimistic.purple && !optimistic.orange) return remoteRoom;
    return {
      ...remoteRoom,
      seats: {
        purple: optimistic.purple ?? remoteRoom.seats.purple,
        orange: optimistic.orange ?? remoteRoom.seats.orange,
      },
    } as RoomMock;
  }, [remoteRoom, optimistic]);
  // サーバ値と一致したら楽観的状態をクリア
  React.useEffect(() => {
    if (!remoteRoom) return;
    setOptimistic((cur) => {
      if (!cur.purple && !cur.orange) return cur;
      const next: { purple?: SeatMock; orange?: SeatMock } = { ...cur };
      if (cur.purple && remoteRoom.seats.purple.uid === cur.purple.uid) delete next.purple;
      if (cur.orange && remoteRoom.seats.orange.uid === cur.orange.uid) delete next.orange;
      return next;
    });
  }, [remoteRoom]);

  // Mock: 既存のローカル挙動
  const { room, createRoom, claimSeat, leaveSeat, setDisplayName, canStart, myUid } =
    useLobbyMock();

  React.useEffect(() => {
    if (!open || remoteMode) return;
    if (!room) createRoom(15);
  }, [open, room, createRoom, remoteMode]);

  // 2P選択直後に roomId が無い場合、自動でロビーを作成（Emulator/開発専用書き込み or Functions）
  const creatingRef = React.useRef(false);
  React.useEffect(() => {
    if (!open) return;
    if (!isFirebaseEnabled) return;
    if (roomId) return; // 既にIDあり
    // 認証完了後にのみ実行（二重作成の抑止）
    if (authLoading || !uid) return;
    if (creatingRef.current) return; // 多重実行防止
    // StrictMode 対策: 直近の自動作成を sessionStorage で短期間ガード（10秒）
    const guardKey = 'ds_auto_create_guard';
    const now = Date.now();
    try {
      const guard = typeof window !== 'undefined' ? window.sessionStorage.getItem(guardKey) : null;
      if (guard) {
        const [status, tsStr] = guard.split(':');
        const ts = Number(tsStr || '0');
        if (status === 'creating' && now - ts < 10000) return;
      }
      if (typeof window !== 'undefined') window.sessionStorage.setItem(guardKey, `creating:${now}`);
    } catch {}
    creatingRef.current = true;
    (async () => {
      try {
        let id: string;
        if (devClientWrites) {
          id = await createRoomDev(15);
        } else {
          const res = await apiCreateRoom(15);
          id = res.roomId;
        }
        if (typeof window !== 'undefined') {
          const base = window.location.origin + window.location.pathname;
          const next = `${base}?mode=2p&roomId=${encodeURIComponent(id)}`;
          window.history.replaceState(null, '', next);
        }
        setRoomId(id);
        try {
          if (typeof window !== 'undefined')
            window.sessionStorage.setItem(guardKey, `created:${Date.now()}`);
        } catch {}
      } catch (e) {
        creatingRef.current = false;
        try {
          if (typeof window !== 'undefined') window.sessionStorage.removeItem(guardKey);
        } catch {}
      }
    })();
  }, [open, isFirebaseEnabled, roomId, authLoading, uid, devClientWrites, createRoomDev]);

  if (!open) return null;

  return (
    <Overlay>
      <div className="panel space-y-4">
        <div className="flex items-center">
          <h2 className="text-lg font-semibold">ロビー</h2>
        </div>

        {isFirebaseEnabled && !roomId && devClientWrites ? (
          <div className="space-y-3">
            <div className="text-sm text-slate-300">
              Firebase のロビーが未指定です。新規に作成できます。
            </div>
            <button
              type="button"
              onClick={async () => {
                const id = await createRoomDev(15);
                if (typeof window !== 'undefined') {
                  const base = window.location.origin + window.location.pathname;
                  const next = `${base}?mode=2p&roomId=${encodeURIComponent(id)}`;
                  window.history.replaceState(null, '', next);
                }
                setRoomId(id);
              }}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              Firebase ロビーを作成
            </button>
          </div>
        ) : remoteMode ? (
          <>
            {authLoading || roomLoading ? (
              <div className="text-sm text-slate-300">Firebase に接続中…</div>
            ) : authError ? (
              <div className="text-sm text-rose-300">認証エラー: {authError}</div>
            ) : roomError ? (
              <div className="text-sm text-rose-300">購読エラー: {roomError}</div>
            ) : !remoteRoom ? (
              <div className="text-sm text-slate-300">ロビーが見つかりません。</div>
            ) : (
              <>
                <div className="rounded-md border border-slate-700 bg-slate-800/60 p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="font-mono">roomId: {remoteRoom.id}</div>
                    <div className="ml-auto text-xs text-slate-400">
                      作成時刻: {new Date(remoteRoom.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="truncate text-xs">部屋URL: {buildRoomUrl(remoteRoom)}</div>
                    <CopyToClipboardButton text={buildRoomUrl(remoteRoom)} />
                  </div>
                </div>
                {devWritesEnabled || !devClientWrites ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(() => {
                      const isHost = Boolean(
                        uid && remoteRoom.hostUid && uid === remoteRoom.hostUid,
                      );
                      const canLeavePurple =
                        isHost || (roomForView ?? remoteRoom)!.seats.purple.uid === uid;
                      const canLeaveOrange =
                        isHost || (roomForView ?? remoteRoom)!.seats.orange.uid === uid;
                      const leaveReason = isHost
                        ? undefined
                        : '自分の席以外は離席できません（ホストのみ可能）';
                      return (
                        <>
                          <LobbySeatCard
                            team="purple"
                            seat={(roomForView ?? remoteRoom)!.seats.purple}
                            onClaim={async (name) => {
                              if (devClientWrites) return claimSeatDev('purple', name ?? '');
                              if (!roomId || !name) return;
                              // 楽観反映
                              if (uid) {
                                setOptimistic((cur) => ({
                                  ...cur,
                                  purple: { occupied: true, displayName: name, uid },
                                }));
                              }
                              try {
                                await apiClaimSeat(roomId, 'purple', name);
                              } catch (e) {
                                // 失敗時はロールバック
                                setOptimistic((cur) => ({ ...cur, purple: undefined }));
                                throw e;
                              }
                            }}
                            onLeave={async () => {
                              if (devClientWrites) return leaveSeatDev('purple');
                              if (!roomId) return;
                              // 楽観反映（displayNameは保持）
                              const current = (roomForView ?? remoteRoom)!.seats.purple;
                              setOptimistic((cur) => ({
                                ...cur,
                                purple: {
                                  occupied: false,
                                  displayName: current.displayName ?? null,
                                  uid: null,
                                },
                              }));
                              try {
                                await apiLeaveSeat(roomId, 'purple');
                              } catch (e) {
                                // ロールバック
                                setOptimistic((cur) => ({ ...cur, purple: undefined }));
                                throw e;
                              }
                            }}
                            onChangeName={(name) => {
                              if (devClientWrites) return setDisplayNameDev('purple', name);
                              // Functions経由は確定時に claimSeat のみ使用
                            }}
                            canLeave={canLeavePurple}
                            leaveDisabledReason={leaveReason}
                            disableClaim={remoteRoom.seats.orange.uid === uid}
                            disableClaimReason="同一ユーザーは両席に着席できません"
                          />
                          <LobbySeatCard
                            team="orange"
                            seat={(roomForView ?? remoteRoom)!.seats.orange}
                            onClaim={async (name) => {
                              if (devClientWrites) return claimSeatDev('orange', name ?? '');
                              if (!roomId || !name) return;
                              if (uid) {
                                setOptimistic((cur) => ({
                                  ...cur,
                                  orange: { occupied: true, displayName: name, uid },
                                }));
                              }
                              try {
                                await apiClaimSeat(roomId, 'orange', name);
                              } catch (e) {
                                setOptimistic((cur) => ({ ...cur, orange: undefined }));
                                throw e;
                              }
                            }}
                            onLeave={async () => {
                              if (devClientWrites) return leaveSeatDev('orange');
                              if (!roomId) return;
                              const current = (roomForView ?? remoteRoom)!.seats.orange;
                              setOptimistic((cur) => ({
                                ...cur,
                                orange: {
                                  occupied: false,
                                  displayName: current.displayName ?? null,
                                  uid: null,
                                },
                              }));
                              try {
                                await apiLeaveSeat(roomId, 'orange');
                              } catch (e) {
                                setOptimistic((cur) => ({ ...cur, orange: undefined }));
                                throw e;
                              }
                            }}
                            onChangeName={(name) => {
                              if (devClientWrites) return setDisplayNameDev('orange', name);
                            }}
                            canLeave={canLeaveOrange}
                            leaveDisabledReason={leaveReason}
                            disableClaim={remoteRoom.seats.purple.uid === uid}
                            disableClaimReason="同一ユーザーは両席に着席できません"
                          />
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(['purple', 'orange'] as const).map((team) => (
                      <div key={team} className="panel space-y-2">
                        <div
                          className={`rounded-md bg-gradient-to-r ${team === 'purple' ? 'from-fuchsia-500 to-purple-600' : 'from-amber-400 to-orange-500'} px-3 py-2 text-slate-900 font-bold text-center`}
                        >
                          {team === 'purple' ? 'パープル' : 'オレンジ'} 席
                        </div>
                        <div className="text-sm text-slate-200">
                          表示名: {(roomForView ?? remoteRoom)!.seats[team].displayName ?? '—'}
                        </div>
                        <div className="text-xs text-slate-400">
                          状態:{' '}
                          {(roomForView ?? remoteRoom)!.seats[team].occupied ? '着席中' : '空席'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-3">
                  {(() => {
                    const bothSeated =
                      (roomForView ?? remoteRoom)!.seats.purple.occupied &&
                      (roomForView ?? remoteRoom)!.seats.orange.occupied;
                    const isHost = uid && remoteRoom.hostUid && uid === remoteRoom.hostUid;
                    const canStart = Boolean(bothSeated && isHost);
                    return (
                      <button
                        type="button"
                        onClick={async () => {
                          if (!roomId) return;
                          await apiStartDraft(roomId);
                        }}
                        disabled={!canStart}
                        className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow enabled:hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed"
                        title={!canStart ? 'ホストかつ両席着席で開始できます' : undefined}
                      >
                        ドラフト開始
                      </button>
                    );
                  })()}
                </div>
              </>
            )}
          </>
        ) : !room ? (
          <div className="text-sm text-slate-300">ロビーを作成中…</div>
        ) : (
          <>
            <div className="rounded-md border border-slate-700 bg-slate-800/60 p-3 text-sm">
              <div className="flex items-center gap-2">
                <div className="font-mono">roomId: {room.id}</div>
                <div className="ml-auto text-xs text-slate-400">
                  作成時刻: {new Date(room.createdAt).toLocaleString()}
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="truncate text-xs">部屋URL: {buildRoomUrl(room)}</div>
                <CopyToClipboardButton text={buildRoomUrl(room)} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <LobbySeatCard
                team="purple"
                seat={room.seats.purple}
                onClaim={(name) => claimSeat('purple', name)}
                onLeave={() => leaveSeat('purple')}
                onChangeName={(name) => setDisplayName('purple', name)}
                disableClaim={room.seats.orange.uid === myUid}
                disableClaimReason="同一ユーザーは両席に着席できません"
              />
              <LobbySeatCard
                team="orange"
                seat={room.seats.orange}
                onClaim={(name) => claimSeat('orange', name)}
                onLeave={() => leaveSeat('orange')}
                onChangeName={(name) => setDisplayName('orange', name)}
                disableClaim={room.seats.purple.uid === myUid}
                disableClaimReason="同一ユーザーは両席に着席できません"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onStartDraft}
                disabled={!canStart}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow enabled:hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed"
                title={!canStart ? '両席が着席で有効になります' : undefined}
              >
                ドラフト開始
              </button>
              {!canStart && (
                <div className="text-sm text-slate-300">両席が着席で開始できます。</div>
              )}
            </div>
          </>
        )}
      </div>
    </Overlay>
  );
};

export default LobbyModal;
