import ModeSelectModal from '@/components/ModeSelectModal';
import LobbyModal from '@/components/lobby/LobbyModal';
import pokemonsData from '@/data/pokemons.json';
import type { Pokemon } from '@/types';
import React from 'react';
import useDraftControllerLocal from './draft/useDraftControllerLocal';
import useDraftControllerRemote from './draft/useDraftControllerRemote';

const TeamPanel = React.lazy(() => import('./components/TeamPanel'));
const CandidateGrid = React.lazy(() => import('./components/CandidateGrid'));

const pokemons = pokemonsData as Pokemon[];

const App: React.FC = () => {
  const [mode, setMode] = React.useState<'1p' | '2p' | null>(null);
  const ctrlLocal = useDraftControllerLocal(pokemons);
  const ctrlRemote = useDraftControllerRemote(pokemons);
  const ctrl = mode === '2p' ? ctrlRemote : ctrlLocal;
  const [showModeSelect, setShowModeSelect] = React.useState(true);
  const [showLobby, setShowLobby] = React.useState(false);

  // 直接URLで roomId が指定された場合は 2人プレイのロビーを自動表示
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    const roomId = sp.get('roomId');
    const modeParam = sp.get('mode');
    if (roomId || modeParam === '2p') {
      setMode('2p');
      setShowModeSelect(false);
      setShowLobby(true);
    }
  }, []);

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur supports-[backdrop-filter]:bg-slate-900/50">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <h1 className="text-xl font-bold">ポケモンユナイト 3BAN ドラフトピッカー(β)</h1>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 space-y-6">
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div>
            <TeamPanel
              team="purple"
              activeHighlight={ctrl.highlights.purple ?? undefined}
              bans={ctrl.state.bans.purple}
              picks={ctrl.state.picks.purple}
            />
          </div>

          <div className="panel flex flex-col items-center justify-center gap-3">
            {!ctrl.state.draftStarted ? (
              <>
                <div className="text-sm text-slate-300">モード選択待ち</div>
                {mode && (
                  <span className="text-xs rounded bg-slate-700 px-2 py-1 text-slate-200">
                    現在: {mode === '1p' ? '1人' : '2人'}
                  </span>
                )}
              </>
            ) : (
              <>
                <div className="text-sm text-slate-300">現在のフェーズ</div>
                <div className="text-2xl font-bold">{ctrl.phaseLabel}</div>
                <div className="text-sm text-slate-300">制限時間</div>
                <div className="text-3xl font-extrabold tabular-nums">
                  {ctrl.state.secondsLeft}s
                </div>
              </>
            )}
          </div>

          <div>
            <TeamPanel
              team="orange"
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
            canSelect={mode === '2p' ? ctrl.canConfirm : true}
            disabledIds={ctrl.disabledIds}
            onConfirm={(p) => ctrl.confirm(p)}
            onSelect={(p) => ctrl.select(p)}
            selectionMode={ctrl.selectionMode}
            onConfirmPair={(pair) => ctrl.confirmPair(pair)}
            onSelectMulti={(list) => ctrl.selectMulti(list)}
          />
        </section>
      </main>

      {/* Modals */}
      <ModeSelectModal
        open={showModeSelect && !ctrl.state.draftStarted}
        onSelect1P={() => {
          setMode('1p');
          setShowModeSelect(false);
          ctrl.start();
        }}
        onSelect2P={() => {
          setMode('2p');
          setShowModeSelect(false);
          setShowLobby(true);
        }}
      />
      <LobbyModal
        open={showLobby && !ctrl.state.draftStarted}
        onStartDraft={() => {
          ctrl.start();
        }}
      />
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
