import React from 'react';
import type { Pokemon } from '@/types';
import { teamGradientClass, teamRingClass, teamTitle } from '@/lib/labels';

type Highlight = { type: 'ban' | 'pick'; index: number };
type HighlightInput = Highlight | Highlight[] | null | undefined;

type Props = {
  team: 'purple' | 'orange';
  activeHighlight?: HighlightInput;
  bans?: (Pokemon | null)[];
  picks?: (Pokemon | null)[];
};

const TeamPanel: React.FC<Props> = ({ team, activeHighlight, bans = [], picks = [] }) => {
  const color = teamGradientClass(team);
  const ringClass = teamRingClass(team);
  const title = `${teamTitle(team)}チーム`;
  const isActive = (type: Highlight['type'], index: number): boolean => {
    if (!activeHighlight) return false;
    const list: Highlight[] = Array.isArray(activeHighlight) ? activeHighlight : [activeHighlight];
    return list.some((h) => h.type === type && h.index === index);
  };
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
            const active = isActive('ban', i);
            const p = bans[i - 1] ?? null;
            return (
              <div
                key={`ban-${i}`}
                className={
                  `slot slot-square ${
                    active ? `animate-pulse ring-2 ${ringClass} ring-offset-2 ring-offset-slate-900` : ''
                  }`
                }
                aria-live={active ? 'polite' : undefined}
                aria-label={active ? `現在のターン: BAN ${i}` : undefined}
                title={active ? '現在のターン' : undefined}
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
            const active = isActive('pick', i);
            const p = picks[i - 1] ?? null;
            return (
              <div
                key={`pick-${i}`}
                className={
                  `slot slot-square ${
                    active ? `animate-pulse ring-2 ${ringClass} ring-offset-2 ring-offset-slate-900` : ''
                  }`
                }
                aria-live={active ? 'polite' : undefined}
                aria-label={active ? `現在のターン: PICK ${i}` : undefined}
                title={active ? '現在のターン' : undefined}
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
