import type { SeatMock } from '@/lobby/types';
import type { Team } from '@/types';
import React from 'react';
import { useImeText } from '@/hooks/useImeText';

type Props = {
  team: Team;
  seat: SeatMock;
  onClaim: (name?: string) => void;
  onLeave: () => void;
  onChangeName: (name: string) => void;
  disableClaim?: boolean;
  disableClaimReason?: string;
  canLeave?: boolean;
  leaveDisabledReason?: string;
};

const LobbySeatCard: React.FC<Props> = ({
  team,
  seat,
  onClaim,
  onLeave,
  onChangeName,
  disableClaim,
  disableClaimReason,
  canLeave = true,
  leaveDisabledReason,
}) => {
  const color =
    team === 'purple' ? 'from-fuchsia-500 to-purple-600' : 'from-amber-400 to-orange-500';
  const title = team === 'purple' ? '先攻' : '後攻';
  const { value, setValue, composing, onChange, onCompositionStart, onCompositionEnd } = useImeText(
    seat.displayName ?? ''
  );

  // 外部からの表示名更新を取り込む（編集中は上書きしない）
  React.useEffect(() => {
    const external = seat.displayName ?? '';
    // 外部更新のみ取り込む。IME確定（compositionend）直後に上書きしないため、
    // composing の変化では発火させない。
    if (!composing && external !== value) {
      setValue(external);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seat.displayName]);

  const handleChange = (next: string): void => {
    onChange(next);
    if (!composing) onChangeName(next);
  };

  const handleBlur = (): void => {
    onChangeName(value);
  };
  return (
    <div className="panel space-y-3">
      <div
        className={`rounded-md bg-gradient-to-r ${color} px-3 py-2 text-slate-900 font-bold text-center`}
      >
        {title}
      </div>
      {/* seatKey は廃止 */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="表示名"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onCompositionStart={onCompositionStart}
          onCompositionEnd={onCompositionEnd}
          onBlur={handleBlur}
          className="flex-1 rounded-md border border-slate-700 bg-slate-800/60 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        {!seat.occupied ? (
          <button
            type="button"
            onClick={() => onClaim(value.trim() || undefined)}
            disabled={!value || value.trim().length === 0 || Boolean(disableClaim)}
            className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow enabled:hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed"
            title={
              !value || value.trim().length === 0
                ? '表示名を入力してください'
                : disableClaim
                  ? (disableClaimReason ?? 'この席には着席できません')
                  : undefined
            }
          >
            着席
          </button>
        ) : (
          <button
            type="button"
            onClick={onLeave}
            disabled={!canLeave}
            className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow enabled:hover:bg-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-400 disabled:opacity-40 disabled:cursor-not-allowed"
            title={
              !canLeave
                ? (leaveDisabledReason ?? 'この席を離席させる権限がありません')
                : undefined
            }
          >
            離席
          </button>
        )}
      </div>
    </div>
  );
};

export default LobbySeatCard;
