import { messageFromFirebaseError } from '@/api/errors';
import { apiCreateRoom } from '@/api/firebaseFunctions';
import { useAnonAuth } from '@/auth/useAnonAuth';
import ModeSelectModal from '@/components/ModeSelectModal';
import LobbyModal from '@/components/lobby/LobbyModal';
import pokemonsData from '@/data/pokemons.json';
import { getFirestoreDb } from '@/lib/firebase';
import type { Pokemon } from '@/types';
import { doc, getDoc } from 'firebase/firestore';
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
  const [preparing2p, setPreparing2p] = React.useState(false);
  const [prepError, setPrepError] = React.useState<string | null>(null);
  const prepareGuardRef = React.useRef(false);
  const [prepAttempt, setPrepAttempt] = React.useState(0);

  // 2人プレイ準備用の匿名認証（準備時のみ有効化）
  const anon = useAnonAuth(preparing2p);

  // 直接URLで roomId が指定された場合は 2人プレイのロビーを自動表示
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    const roomId = sp.get('roomId');
    const modeParam = sp.get('mode');
    if (roomId) {
      setMode('2p');
      setShowModeSelect(false);
      setShowLobby(true);
    } else if (modeParam === '2p') {
      // roomId なしで 2p 指定の場合は、裏で準備してからロビー表示
      setMode('2p');
      setShowModeSelect(false);
      setPreparing2p(true);
    }
  }, []);

  // 2人プレイの準備フロー（匿名認証 → 部屋作成 → URL 更新 → 初回ドキュメント存在確認 → ロビー表示）
  React.useEffect(() => {
    if (!preparing2p) return;
    if (prepareGuardRef.current) return;
    if (anon.loading) return;
    if (anon.error) {
      setPrepError(anon.error);
      return;
    }
    if (!anon.uid) return;
    prepareGuardRef.current = true;
    (async () => {
      try {
        setPrepError(null);
        const res = await apiCreateRoom(15);
        const id = res.roomId;
        if (typeof window !== 'undefined') {
          const base = window.location.origin + window.location.pathname;
          const next = `${base}?mode=2p&roomId=${encodeURIComponent(id)}`;
          window.history.replaceState(null, '', next);
        }
        // 任意: 初回読み取りで存在を確認（購読前に作成完了を担保）
        try {
          const db = getFirestoreDb();
          const ref = doc(db, 'rooms', id);
          await getDoc(ref);
        } catch {
          // 読み取り失敗は致命ではないため握りつぶす
        }
        setShowLobby(true);
        setPreparing2p(false);
      } catch (e) {
        setPrepError(messageFromFirebaseError(e));
      } finally {
        prepareGuardRef.current = false;
      }
    })();
  }, [preparing2p, anon.loading, anon.error, anon.uid, prepAttempt]);

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur supports-[backdrop-filter]:bg-slate-900/50">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <h1 className="text-xl font-bold">Pokemon Unite 3BAN Draft Picker (β)</h1>
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
                <div className="text-sm">
                  {mode === '2p' && ctrl.isSpectator ? (
                    <span className="rounded bg-slate-700/60 text-slate-200 px-2 py-0.5">
                      観戦中
                    </span>
                  ) : ctrl.canConfirm ? (
                    <span className="rounded bg-emerald-700/40 text-emerald-200 px-2 py-0.5">
                      あなたのターン
                    </span>
                  ) : (
                    <span className="rounded bg-slate-700/60 text-slate-200 px-2 py-0.5">
                      相手のターン
                    </span>
                  )}
                </div>
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
      {preparing2p && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-md p-4">
            <div className="panel space-y-3">
              <div className="text-lg font-semibold">2人プレイの準備中…</div>
              {prepError ? (
                <>
                  <div className="rounded-md border border-rose-700 bg-rose-900/40 px-3 py-2 text-sm text-rose-100">
                    {prepError}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      onClick={() => {
                        setPrepError(null);
                        // 再試行
                        prepareGuardRef.current = false;
                        setPrepAttempt((n) => n + 1);
                      }}
                    >
                      再試行
                    </button>
                    <button
                      type="button"
                      className="rounded-md bg-slate-700 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400"
                      onClick={() => {
                        setPrepError(null);
                        setPreparing2p(false);
                        setShowModeSelect(true);
                        setMode(null);
                      }}
                    >
                      モード選択に戻る
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-sm text-slate-300">部屋を作成しています…</div>
              )}
            </div>
          </div>
        </div>
      )}
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
          setPreparing2p(true);
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
