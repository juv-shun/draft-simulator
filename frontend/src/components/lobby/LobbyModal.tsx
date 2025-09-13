import { apiClaimSeat, apiCreateRoom, apiLeaveSeat, apiStartDraft } from '@/api/firebaseFunctions';
import { useAnonAuth } from '@/auth/useAnonAuth';
import CopyToClipboardButton from '@/components/common/CopyToClipboardButton';
import StartButton from '@/components/lobby/StartButton';
import { buildRoomUrl } from '@/lib/roomUrl';
import type { RoomMock, SeatMock } from '@/lobby/types';
import { useLobbyMock } from '@/lobby/useLobbyMock';
import { useLobbyRemote } from '@/lobby/useLobbyRemote';
import SeatsGrid from '@/components/lobby/SeatsGrid';
import useAutoRoomCreation from '@/lobby/useAutoRoomCreation';
import useOptimisticSeats from '@/lobby/useOptimisticSeats';
import React from 'react';
import { messageFromFirebaseError } from '@/api/errors';
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

// URL組立は util に移動

function getRoomIdFromLocation(): string | null {
  if (typeof window === 'undefined') return null;
  const q = new URLSearchParams(window.location.search);
  return q.get('roomId');
}

const LobbyModal: React.FC<Props> = ({ open, onStartDraft }) => {
  // フェーズ4以降は直書きモードを廃止（常に Functions 経由）
  const [roomId, setRoomId] = React.useState<string | null>(getRoomIdFromLocation());
  React.useEffect(() => {
    // モーダルが開くタイミングで URL を確認
    if (open) setRoomId(getRoomIdFromLocation());
  }, [open]);
  const remoteMode = open && Boolean(roomId);

  // Remote: 匿名Auth + Firestore購読（読み取りのみ）
  // ルーム未作成時でもサインインが必要なため、モーダルが開いたら有効化
  const { uid, loading: authLoading, error: authError } = useAnonAuth(open);
  const {
    room: remoteRoom,
    loading: roomLoading,
    error: roomError,
  } = useLobbyRemote(remoteMode ? roomId : null);
  const [actionError, setActionError] = React.useState<string | null>(null);

  // 楽観的座席状態（購読結果に即時反映）
  const { roomForView, setOptimistic } = useOptimisticSeats(remoteRoom, uid);

  // Mock: 既存のローカル挙動
  const { room, createRoom, claimSeat, leaveSeat, setDisplayName, canStart, myUid } =
    useLobbyMock();

  React.useEffect(() => {
    if (!open || remoteMode) return;
    if (!room) createRoom(15);
  }, [open, room, createRoom, remoteMode]);

  // 2P選択直後に roomId が無ければ自動で Functions にて作成
  useAutoRoomCreation({
    enabled: open && !roomId,
    roomId,
    authLoading,
    uid,
    onCreated: (id) => setRoomId(id),
  });

  if (!open) return null;

  return (
    <Overlay>
      <div className="panel space-y-4">
        <div className="flex items-center">
          <h2 className="text-lg font-semibold">ロビー</h2>
        </div>

        {remoteMode ? (
          <>
            {authLoading || roomLoading ? (
              <div className="text-sm text-slate-300">Firebase に接続中…</div>
            ) : authError ? (
              <div className="text-sm text-rose-300">認証エラー: {authError}</div>
            ) : roomError ? (
              <div className="text-sm text-rose-300">エラー: {roomError}</div>
            ) : !remoteRoom ? (
              <div className="text-sm text-slate-300">ロビーが見つかりません。</div>
            ) : (
              <>
                {actionError && (
                  <div className="rounded-md border border-rose-700 bg-rose-900/40 px-3 py-2 text-sm text-rose-100">
                    {actionError}
                  </div>
                )}
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
                {roomForView && (
                  <SeatsGrid
                    room={roomForView}
                    uid={uid}
                    canLeaveOtherSeat={Boolean(uid && remoteRoom.hostUid && uid === remoteRoom.hostUid)}
                    onClaim={async (team, name) => {
                      if (!roomId || !name) return;
                      if (uid) {
                        setOptimistic((cur) => ({
                          ...cur,
                          [team]: { occupied: true, displayName: name, uid } as SeatMock,
                        }));
                      }
                      try {
                        setActionError(null);
                        await apiClaimSeat(roomId, team, name);
                      } catch (e) {
                        setOptimistic((cur) => ({ ...cur, [team]: undefined }));
                        setActionError(messageFromFirebaseError(e));
                      }
                    }}
                    onLeave={async (team) => {
                      if (!roomId) return;
                      const current = roomForView.seats[team];
                      setOptimistic((cur) => ({
                        ...cur,
                        [team]: { occupied: false, displayName: current.displayName ?? null, uid: null } as SeatMock,
                      }));
                      try {
                        setActionError(null);
                        await apiLeaveSeat(roomId, team);
                      } catch (e) {
                        setOptimistic((cur) => ({ ...cur, [team]: undefined }));
                        setActionError(messageFromFirebaseError(e));
                      }
                    }}
                  />
                )}
                {(() => {
                  // 開始条件は必ずサーバ実体(remoteRoom)に基づいて判定（楽観状態は使わない）
                  const bothSeatedRemote = Boolean(
                    remoteRoom?.seats.purple.occupied && remoteRoom?.seats.orange.occupied,
                  );
                  const isHost = Boolean(uid && remoteRoom?.hostUid && uid === remoteRoom.hostUid);
                  const canStart = Boolean(bothSeatedRemote && isHost);
                  return (
                    <StartButton
                      disabled={!canStart}
                      titleWhenDisabled={'ホストかつ両席着席で開始できます'}
                      onClick={async () => {
                        if (!roomId) return;
                        try {
                          setActionError(null);
                          await apiStartDraft(roomId);
                        } catch (e) {
                          setActionError(messageFromFirebaseError(e));
                        }
                      }}
                    />
                  );
                })()}
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
