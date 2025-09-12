import React from 'react';
import type { Pokemon } from '@/types';
import pokemonsData from '@/data/pokemons.json';
import useDraftControllerLocal from './draft/useDraftControllerLocal';

const TeamPanel = React.lazy(() => import('./components/TeamPanel'));
const CandidateGrid = React.lazy(() => import('./components/CandidateGrid'));

const pokemons = pokemonsData as Pokemon[];

const App: React.FC = () => {
  const ctrl = useDraftControllerLocal(pokemons);

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur supports-[backdrop-filter]:bg-slate-900/50">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <h1 className="text-xl font-bold">ポケモンユナイト 3BAN ドラフトピッカー(α)</h1>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 space-y-6">
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div>
            <TeamPanel
              team="purple"
              title="パープルチーム（先攻）"
              activeHighlight={ctrl.highlights.purple ?? undefined}
              bans={ctrl.state.bans.purple}
              picks={ctrl.state.picks.purple}
            />
          </div>

          <div className="panel flex flex-col items-center justify-center gap-3">
            {!ctrl.state.draftStarted ? (
              <>
                <button
                  type="button"
                  onClick={() => ctrl.start()}
                  className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  ドラフトピック開始
                </button>
              </>
            ) : (
              <>
                <div className="text-sm text-slate-300">現在のフェーズ</div>
                <div className="text-2xl font-bold">{ctrl.phaseLabel}</div>
                <div className="text-sm text-slate-300">制限時間</div>
                <div className="text-3xl font-extrabold tabular-nums">{ctrl.state.secondsLeft}s</div>
              </>
            )}
          </div>

          <div>
            <TeamPanel
              team="orange"
              title="オレンジチーム（後攻）"
              activeHighlight={ctrl.highlights.orange ?? undefined}
              bans={ctrl.state.bans.orange}
              picks={ctrl.state.picks.orange}
            />
          </div>
        </section>

        <section>
          <CandidateGrid
            pokemons={pokemons}
            canConfirm={ctrl.canConfirm}
            disabledIds={ctrl.disabledIds}
            onConfirm={(p) => ctrl.confirm(p)}
            onSelect={(p) => ctrl.select(p)}
            selectionMode={ctrl.selectionMode}
            onConfirmPair={(pair) => ctrl.confirmPair(pair)}
            onSelectMulti={(list) => ctrl.selectMulti(list)}
          />
        </section>
      </main>
    </div>
  );
};

export default function AppWithSuspense(): JSX.Element {
  return (
    <React.Suspense fallback={<div className="px-4 py-6 text-slate-300">読み込み中…</div>}>
      <App />
    </React.Suspense>
  );
}

