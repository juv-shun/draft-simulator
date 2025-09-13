import React from 'react';
import type { RoomMock } from '@/lobby/types';
import { useLobbyMock } from '@/lobby/useLobbyMock';
import LobbySeatCard from './LobbySeatCard';
import CopyToClipboardButton from '@/components/common/CopyToClipboardButton';
import { useAnonAuth } from '@/auth/useAnonAuth';
import { useLobbyRemote } from '@/lobby/useLobbyRemote';

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
  const base = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
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

  // Mock: 既存のローカル挙動
  const { room, createRoom, claimSeat, leaveSeat, setDisplayName, canStart, myUid } = useLobbyMock();

  React.useEffect(() => {
    if (!open || remoteMode) return;
    if (!room) createRoom(15);
  }, [open, room, createRoom, remoteMode]);

  // 2P選択直後に roomId が無い場合、自動でロビーを作成（Emulator/開発専用書き込み）
  const creatingRef = React.useRef(false);
  React.useEffect(() => {
    if (!open) return;
    if (!isFirebaseEnabled) return;
    if (!devClientWrites) return;
    if (roomId) return; // 既にIDあり
    if (creatingRef.current) return; // 多重実行防止
    creatingRef.current = true;
    (async () => {
      try {
        const id = await createRoomDev(15);
        if (typeof window !== 'undefined') {
          const base = window.location.origin + window.location.pathname;
          const next = `${base}?mode=2p&roomId=${encodeURIComponent(id)}`;
          window.history.replaceState(null, '', next);
        }
        setRoomId(id);
      } catch (e) {
        // 失敗時はフラグを戻し、ボタン経由にフォールバック
        creatingRef.current = false;
      }
    })();
  }, [open, isFirebaseEnabled, devClientWrites, roomId, createRoomDev]);

  if (!open) return null;

  return (
    <Overlay>
      <div className="panel space-y-4">
        <div className="flex items-center">
          <h2 className="text-lg font-semibold">
            2人プレイ ロビー{remoteMode ? '（Firebase 読み取り）' : '（モック）'}
          </h2>
        </div>

        {isFirebaseEnabled && !roomId && devClientWrites ? (
          <div className="space-y-3">
            <div className="text-sm text-slate-300">Firebase のロビーが未指定です。新規に作成できます。</div>
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
                    <div className="ml-auto text-xs text-slate-400">作成時刻: {new Date(remoteRoom.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="truncate text-xs">部屋URL: {buildRoomUrl(remoteRoom)}</div>
                    <CopyToClipboardButton text={buildRoomUrl(remoteRoom)} />
                  </div>
                </div>
                {devWritesEnabled ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <LobbySeatCard
                      team="purple"
                      seat={remoteRoom.seats.purple}
                      onClaim={(name) => claimSeatDev('purple', name ?? '')}
                      onLeave={() => leaveSeatDev('purple')}
                      onChangeName={(name) => setDisplayNameDev('purple', name)}
                      disableClaim={remoteRoom.seats.orange.uid === uid}
                      disableClaimReason="同一ユーザーは両席に着席できません"
                    />
                    <LobbySeatCard
                      team="orange"
                      seat={remoteRoom.seats.orange}
                      onClaim={(name) => claimSeatDev('orange', name ?? '')}
                      onLeave={() => leaveSeatDev('orange')}
                      onChangeName={(name) => setDisplayNameDev('orange', name)}
                      disableClaim={remoteRoom.seats.purple.uid === uid}
                      disableClaimReason="同一ユーザーは両席に着席できません"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(['purple', 'orange'] as const).map((team) => (
                      <div key={team} className="panel space-y-2">
                        <div className={`rounded-md bg-gradient-to-r ${team === 'purple' ? 'from-fuchsia-500 to-purple-600' : 'from-amber-400 to-orange-500'} px-3 py-2 text-slate-900 font-bold text-center`}>
                          {team === 'purple' ? 'パープル' : 'オレンジ'} 席
                        </div>
                        <div className="text-sm text-slate-200">表示名: {remoteRoom.seats[team].displayName ?? '—'}</div>
                        <div className="text-xs text-slate-400">状態: {remoteRoom.seats[team].occupied ? '着席中' : '空席'}</div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {}}
                    disabled
                    className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white opacity-40 cursor-not-allowed"
                    title="フェーズ3では開始操作は無効です（表示のみ）"
                  >
                    ドラフト開始（無効）
                  </button>
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
                <div className="ml-auto text-xs text-slate-400">作成時刻: {new Date(room.createdAt).toLocaleString()}</div>
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
              {!canStart && <div className="text-sm text-slate-300">両席が着席で開始できます。</div>}
            </div>
          </>
        )}
      </div>
    </Overlay>
  );
};

export default LobbyModal;
