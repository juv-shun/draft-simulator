import React from 'react';
import type { RoomMock } from '@/lobby/types';
import { useLobbyMock } from '@/lobby/useLobbyMock';
import LobbySeatCard from './LobbySeatCard';
import CopyToClipboardButton from '@/components/common/CopyToClipboardButton';

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

const LobbyModal: React.FC<Props> = ({ open, onStartDraft }) => {
  const { room, createRoom, claimSeat, leaveSeat, setDisplayName, canStart, myUid } = useLobbyMock();

  React.useEffect(() => {
    if (!open) return;
    if (!room) createRoom(15);
  }, [open, room, createRoom]);

  if (!open) return null;

  return (
    <Overlay>
      <div className="panel space-y-4">
        <div className="flex items-center">
          <h2 className="text-lg font-semibold">2人プレイ ロビー（モック）</h2>
        </div>

        {!room ? (
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
