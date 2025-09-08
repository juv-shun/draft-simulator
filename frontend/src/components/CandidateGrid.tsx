import type { Pokemon } from '@/types';
import React from 'react';

type Props = {
  pokemons: Pokemon[];
  onConfirm?: (pokemon: Pokemon) => void;
  canConfirm?: boolean;
  disabledIds?: string[];
  onSelect?: (pokemon: Pokemon | null) => void;
};

const CandidateGrid: React.FC<Props> = ({
  pokemons,
  onConfirm,
  canConfirm = true,
  disabledIds = [],
  onSelect,
}) => {
  const [selectedType, setSelectedType] = React.useState<string>('すべて');
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const types = React.useMemo<string[]>(() => {
    const set = new Set<string>(pokemons.map((p) => p.type));
    return ['すべて', ...Array.from(set)];
  }, [pokemons]);

  const filtered = React.useMemo<Pokemon[]>(() => {
    if (selectedType === 'すべて') return pokemons;
    return pokemons.filter((p) => p.type === selectedType);
  }, [pokemons, selectedType]);

  const selectedPokemon = React.useMemo<Pokemon | null>(
    () => pokemons.find((p) => p.id === selectedId) ?? null,
    [pokemons, selectedId]
  );

  // 無効化されたIDが選択中だった場合は解除
  React.useEffect(() => {
    if (selectedId && disabledIds.includes(selectedId)) {
      setSelectedId(null);
      if (onSelect) onSelect(null);
    }
  }, [disabledIds, selectedId]);

  const isSelectedDisabled = selectedPokemon ? disabledIds.includes(selectedPokemon.id) : false;
  const canPressConfirm = Boolean(selectedPokemon) && canConfirm && !isSelectedDisabled;

  const handleConfirm = (): void => {
    if (selectedPokemon && !isSelectedDisabled && onConfirm) onConfirm(selectedPokemon);
  };

  return (
    <div className="panel">
      <div className="mb-3 flex items-center gap-3">
        <h3 className="text-base font-semibold">ポケモン一覧</h3>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!selectedPokemon || !canConfirm}
          title={!canConfirm ? 'ドラフト開始後に有効になります' : undefined}
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow enabled:hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          選択を決定
        </button>
        <div className="ml-auto flex flex-wrap items-center gap-2">
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
        {filtered.map((p) => {
          const isSelected = selectedId === p.id;
          const isDisabled = disabledIds.includes(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                if (isDisabled) return;
                setSelectedId(p.id);
                if (onSelect) onSelect(p);
              }}
              className={
                'group relative rounded-lg border transition-colors overflow-hidden focus:outline-none focus:ring-2 ' +
                (isDisabled
                  ? 'border-slate-700 bg-slate-800/40 opacity-40 grayscale cursor-not-allowed'
                  : isSelected
                  ? 'border-indigo-400 bg-indigo-500/10 ring-indigo-400'
                  : 'border-slate-700 bg-slate-800/60 hover:bg-slate-700/60')
              }
              disabled={isDisabled}
              aria-pressed={isSelected}
              aria-label={p.name}
              aria-disabled={isDisabled}
              title={isDisabled ? 'BAN/PICK済みのため選べません' : undefined}
            >
              <div className="aspect-square bg-slate-900/40 flex items-center justify-center">
                <img
                  src={p.imageUrl}
                  alt={p.name}
                  className="h-[80%] w-[80%] object-contain"
                  loading="lazy"
                />
              </div>
              {isDisabled && (
                <span className="absolute top-1 right-1 rounded bg-slate-900/80 px-1.5 py-0.5 text-[10px] text-slate-200">
                  禁止
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CandidateGrid;
