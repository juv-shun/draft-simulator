import React from 'react';
import type { Pokemon } from '@/types';

type Props = {
  pokemons: Pokemon[];
};

const CandidateGrid: React.FC<Props> = ({ pokemons }) => {
  const [selectedType, setSelectedType] = React.useState<string>('すべて');

  const types = React.useMemo<string[]>(() => {
    const set = new Set<string>(pokemons.map((p) => p.type));
    return ['すべて', ...Array.from(set)];
  }, [pokemons]);

  const filtered = React.useMemo<Pokemon[]>(() => {
    if (selectedType === 'すべて') return pokemons;
    return pokemons.filter((p) => p.type === selectedType);
  }, [pokemons, selectedType]);

  return (
    <div className="panel">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold">候補ポケモン一覧</h3>
        <div className="flex flex-wrap items-center gap-2">
          {types.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setSelectedType(t)}
              className={
                'rounded-full border px-3 py-1 text-xs transition-colors ' +
                (selectedType === t
                  ? 'border-indigo-400 bg-indigo-500/20 text-indigo-200'
                  : 'border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700/60')
              }
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2">
        {filtered.map((p) => (
          <div
            key={p.id}
            className="group rounded-lg border border-slate-700 bg-slate-800/60 hover:bg-slate-700/60 transition-colors overflow-hidden"
          >
            <div className="aspect-square bg-slate-900/40 flex items-center justify-center">
              <img
                src={p.imageUrl}
                alt={p.name}
                className="h-[80%] w-[80%] object-contain"
                loading="lazy"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CandidateGrid;
