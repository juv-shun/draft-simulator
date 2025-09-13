import React from 'react';

type Props = {
  count?: number;
};

/**
 * 観客席のプレースホルダーを表示する（現在、開発中）
 */
const SpectatorSeats: React.FC<Props> = ({ count = 10 }) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="text-base font-semibold">観客席</h3>
        <span className="text-xs text-slate-400">現在、開発中</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="panel flex items-center justify-between opacity-60">
            <div className="text-sm">観客席 #{i + 1}</div>
            <button
              type="button"
              disabled
              title="現在、開発中"
              className="rounded-md bg-slate-600 px-3 py-1.5 text-xs font-semibold text-white shadow disabled:opacity-50 cursor-not-allowed"
            >
              入場
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SpectatorSeats;

