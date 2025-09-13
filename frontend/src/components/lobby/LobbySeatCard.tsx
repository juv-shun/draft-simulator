import React from 'react';
import type { Team } from '@/types';
import type { SeatMock } from '@/lobby/types';

type Props = {
  team: Team;
  seat: SeatMock;
  onClaim: (name?: string) => void;
  onLeave: () => void;
  onChangeName: (name: string) => void;
  disableClaim?: boolean;
  disableClaimReason?: string;
};

const LobbySeatCard: React.FC<Props> = ({ team, seat, onClaim, onLeave, onChangeName, disableClaim, disableClaimReason }) => {
  const color = team === 'purple' ? 'from-fuchsia-500 to-purple-600' : 'from-amber-400 to-orange-500';
  const title = team === 'purple' ? 'パープル' : 'オレンジ';
  return (
    <div className="panel space-y-3">
      <div className={`rounded-md bg-gradient-to-r ${color} px-3 py-2 text-slate-900 font-bold text-center`}>
        {title} 席
      </div>
      {/* seatKey は廃止 */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="表示名"
          value={seat.displayName ?? ''}
          onChange={(e) => onChangeName(e.target.value)}
          className="w-full rounded-md border border-slate-700 bg-slate-800/60 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>
      <div className="flex items-center gap-2">
        {!seat.occupied ? (
          <button
            type="button"
            onClick={() => onClaim(seat.displayName?.trim() || undefined)}
            disabled={
              !seat.displayName || seat.displayName.trim().length === 0 || Boolean(disableClaim)
            }
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow enabled:hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed"
            title={
              !seat.displayName || seat.displayName.trim().length === 0
                ? '表示名を入力してください'
                : disableClaim
                ? disableClaimReason ?? 'この席には着席できません'
                : undefined
            }
          >
            着席
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={onLeave}
              className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-400"
            >
              離席
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default LobbySeatCard;
