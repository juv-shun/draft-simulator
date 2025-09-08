import React from 'react';
import type { Pokemon } from '@/types';

type Highlight = { type: 'ban' | 'pick'; index: number } | null | undefined;

type Props = {
  team: 'purple' | 'orange';
  title: string;
  activeHighlight?: Highlight;
  bans?: (Pokemon | null)[];
  picks?: (Pokemon | null)[];
};

const TeamPanel: React.FC<Props> = ({ team, title, activeHighlight, bans = [], picks = [] }) => {
  const color = team === 'purple' ? 'from-fuchsia-500 to-purple-600' : 'from-amber-400 to-orange-500';
  const ringClass = team === 'purple' ? 'ring-fuchsia-300' : 'ring-amber-300';
  return (
    <div className="panel space-y-4">
      <div
        className={`rounded-md bg-gradient-to-r ${color} px-3 py-2 text-slate-900 font-bold text-center`}
      >
        {title}
      </div>

      <section>
        <h3 className="mb-2 text-sm text-slate-300">使用禁止（BAN）</h3>
        <div className="grid grid-cols-3 gap-2 place-items-center">
          {[1, 2, 3].map((i) => {
            const isActive = activeHighlight?.type === 'ban' && activeHighlight.index === i;
            const p = bans[i - 1] ?? null;
            return (
              <div
                key={`ban-${i}`}
                className={
                  `slot slot-square ${
                    isActive ? `animate-pulse ring-2 ${ringClass} ring-offset-2 ring-offset-slate-900` : ''
                  }`
                }
                aria-live={isActive ? 'polite' : undefined}
                aria-label={isActive ? `現在のターン: BAN ${i}` : undefined}
                title={isActive ? '現在のターン' : undefined}
              >
                {p ? (
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    className="h-[80%] w-[80%] object-contain"
                  />
                ) : (
                  <>BAN {i}</>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm text-slate-300">使用ポケモン（PICK）</h3>
        <div className="grid grid-cols-5 gap-2 place-items-center">
          {[1, 2, 3, 4, 5].map((i) => {
            const isActive = activeHighlight?.type === 'pick' && activeHighlight.index === i;
            const p = picks[i - 1] ?? null;
            return (
              <div
                key={`pick-${i}`}
                className={
                  `slot slot-square ${
                    isActive ? `animate-pulse ring-2 ${ringClass} ring-offset-2 ring-offset-slate-900` : ''
                  }`
                }
                aria-live={isActive ? 'polite' : undefined}
                aria-label={isActive ? `現在のターン: PICK ${i}` : undefined}
                title={isActive ? '現在のターン' : undefined}
              >
                {p ? (
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    className="h-[80%] w-[80%] object-contain"
                  />
                ) : (
                  <>{i}</>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default TeamPanel;
