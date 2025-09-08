import type { Pokemon } from '@/types';
import React from 'react';
// 遅延読み込みコンポーネントを先に宣言
const TeamPanel = React.lazy(() => import('./components/TeamPanel'));
const CandidateGrid = React.lazy(() => import('./components/CandidateGrid'));
// Viteのfs.allowにより、上位のdocsからJSONをインポート（ビルド時取り込み）
// 相対パスは src -> frontend -> docs （リポジトリ直下）
import pokemonsData from '../../docs/pokemons.json';

const pokemons = pokemonsData as Pokemon[];

type Team = 'purple' | 'orange';
type Action = 'ban' | 'pick';
type Turn = { team: Team; action: Action; index: number } | null;

const App: React.FC = () => {
  const [draftStarted, setDraftStarted] = React.useState<boolean>(false);
  const [phase, setPhase] = React.useState<string>('—');
  const [secondsLeft, setSecondsLeft] = React.useState<number>(15);
  const [activeTurn, setActiveTurn] = React.useState<Turn>(null);
  const [bans, setBans] = React.useState<{
    purple: (Pokemon | null)[];
    orange: (Pokemon | null)[];
  }>(() => ({ purple: [null, null, null], orange: [null, null, null] }));
  const [picks, setPicks] = React.useState<{
    purple: (Pokemon | null)[];
    orange: (Pokemon | null)[];
  }>(() => ({ purple: [null, null, null, null, null], orange: [null, null, null, null, null] }));
  const [pendingSelection, setPendingSelection] = React.useState<Pokemon | null>(null);
  const [pendingMulti, setPendingMulti] = React.useState<Pokemon[]>([]);

  const timerRef = React.useRef<number | null>(null);

  const startCountdown = React.useCallback(() => {
    // 15秒からカウントダウン開始
    setSecondsLeft(15);
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
    }
    timerRef.current = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          // 0になったら停止（次のロジックは後で実装）
          if (timerRef.current) window.clearInterval(timerRef.current);
          timerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const stopTimer = React.useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // 次のターンへ移行してタイマーを再開
  const gotoTurn = React.useCallback(
    (turn: Exclude<Turn, null>) => {
      setActiveTurn(turn);
      setPendingSelection(null);
      setPendingMulti([]);
      startCountdown();
    },
    [startCountdown],
  );

  // クリーンアップ
  React.useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  // タイマー切れ時の自動BAN（使用禁止フェーズ1: BAN1→BAN2、使用禁止フェーズ2: BAN3）
  React.useEffect(() => {
    if (!draftStarted) return;
    if (secondsLeft !== 0) return;
    if (!activeTurn || activeTurn.action !== 'ban') return;
    // スコープ: BAN1, BAN2, BAN3
    if (activeTurn.index !== 1 && activeTurn.index !== 2 && activeTurn.index !== 3) return;
    if (activeTurn.team === 'purple' && bans.purple[activeTurn.index - 1]) return; // 確定済み
    if (activeTurn.team === 'orange' && bans.orange[activeTurn.index - 1]) return; // 確定済み

    // すでにBAN/PICKされたIDを集合化
    const usedIds = new Set<string>();
    [...bans.purple, ...bans.orange, ...picks.purple, ...picks.orange].forEach((pp) => {
      if (pp) usedIds.add(pp.id);
    });

    // 未使用の中から選択。ユーザーがクリック済みならそれを優先、なければランダム
    const candidates = pokemons.filter((p) => !usedIds.has(p.id));
    if (candidates.length === 0) return;
    const preferred =
      pendingSelection && !usedIds.has(pendingSelection.id) ? pendingSelection : null;
    const choice = preferred ?? candidates[Math.floor(Math.random() * candidates.length)];

    if (activeTurn.team === 'purple') {
      setBans((prev) => ({
        ...prev,
        purple: prev.purple.map((x, idx) => (idx === activeTurn.index - 1 ? choice : x)),
      }));
      setPendingSelection(null);
      // 次のターンへ
      if (activeTurn.index === 1) {
        gotoTurn({ team: 'orange', action: 'ban', index: 1 });
      } else if (activeTurn.index === 2) {
        gotoTurn({ team: 'orange', action: 'ban', index: 2 });
      } else if (activeTurn.index === 3) {
        gotoTurn({ team: 'orange', action: 'ban', index: 3 });
      }
    } else if (activeTurn.team === 'orange') {
      setBans((prev) => ({
        ...prev,
        orange: prev.orange.map((x, idx) => (idx === activeTurn.index - 1 ? choice : x)),
      }));
      setPendingSelection(null);
      if (activeTurn.index === 1) {
        // 次のターン: パープル BAN2
        gotoTurn({ team: 'purple', action: 'ban', index: 2 });
      } else if (activeTurn.index === 2) {
        // 使用禁止フェーズ1完了 → 使用ポケモン選択フェーズ1の開始（パープル PICK1）
        setPhase('使用ポケモン選択フェーズ1');
        gotoTurn({ team: 'purple', action: 'pick', index: 1 });
      } else if (activeTurn.index === 3) {
        // 使用禁止フェーズ2完了 → 使用ポケモン選択フェーズ2開始（オレンジ PICK4）
        setPhase('使用ポケモン選択フェーズ2');
        gotoTurn({ team: 'orange', action: 'pick', index: 4 });
      }
    }
  }, [secondsLeft, activeTurn, draftStarted, bans, picks, pendingSelection, gotoTurn, stopTimer]);

  // タイマー切れ時の自動PICK（フェーズ1: パープル1/オレンジ1-2/パープル2-3/オレンジ3、フェーズ2: オレンジ4/パープル4-5/オレンジ5）
  React.useEffect(() => {
    if (!draftStarted) return;
    if (secondsLeft !== 0) return;
    if (!activeTurn || activeTurn.action !== 'pick') return;
    if (activeTurn.team === 'purple' && activeTurn.index === 1) {
      if (picks.purple[0]) return; // 既に確定済み

      const usedIds = new Set<string>();
      [...bans.purple, ...bans.orange, ...picks.purple, ...picks.orange].forEach((pp) => {
        if (pp) usedIds.add(pp.id);
      });
      const candidates = pokemons.filter((p) => !usedIds.has(p.id));
      if (candidates.length === 0) return;
      const preferred =
        pendingSelection && !usedIds.has(pendingSelection.id) ? pendingSelection : null;
      const choice = preferred ?? candidates[Math.floor(Math.random() * candidates.length)];

      setPicks((prev) => ({
        ...prev,
        purple: prev.purple.map((x, idx) => (idx === 0 ? choice : x)),
      }));
      setPendingSelection(null);
      // 次のターンへ: オレンジ PICK1・PICK2（1ターンで2匹）
      gotoTurn({ team: 'orange', action: 'pick', index: 1 });
      return;
    }

    // オレンジのPICK1・PICK2（1ターンで2匹）タイムアウト処理
    if (activeTurn.team === 'orange' && activeTurn.index === 1) {
      if (picks.orange[0] && picks.orange[1]) return;

      const usedIds = new Set<string>();
      [...bans.purple, ...bans.orange, ...picks.purple, ...picks.orange].forEach((pp) => {
        if (pp) usedIds.add(pp.id);
      });

      const result: Pokemon[] = [];
      // 選択済みを優先
      pendingMulti.forEach((pp) => {
        if (!usedIds.has(pp.id) && !result.find((r) => r.id === pp.id) && result.length < 2) {
          result.push(pp);
          usedIds.add(pp.id);
        }
      });

      // 不足分は未使用からランダム補完
      const candidates = pokemons.filter((p) => !usedIds.has(p.id));
      while (result.length < 2 && candidates.length > 0) {
        const idx = Math.floor(Math.random() * candidates.length);
        const choice = candidates.splice(idx, 1)[0];
        result.push(choice);
      }
      if (result.length < 2) return; // 念のため安全策

      setPicks((prev) => ({
        ...prev,
        orange: prev.orange.map((x, idx) => (idx === 0 ? result[0] : idx === 1 ? result[1] : x)),
      }));
      setPendingSelection(null);
      setPendingMulti([]);
      // 次のターンへ: パープル PICK2・PICK3
      gotoTurn({ team: 'purple', action: 'pick', index: 2 });
      return;
    }

    // パープルのPICK2・PICK3（1ターンで2匹）タイムアウト処理
    if (activeTurn.team === 'purple' && activeTurn.index === 2) {
      if (picks.purple[1] && picks.purple[2]) return;

      const usedIds = new Set<string>();
      [...bans.purple, ...bans.orange, ...picks.purple, ...picks.orange].forEach((pp) => {
        if (pp) usedIds.add(pp.id);
      });

      const result: Pokemon[] = [];
      // 選択済みを優先
      pendingMulti.forEach((pp) => {
        if (!usedIds.has(pp.id) && !result.find((r) => r.id === pp.id) && result.length < 2) {
          result.push(pp);
          usedIds.add(pp.id);
        }
      });

      // 不足分は未使用からランダム補完
      const candidates = pokemons.filter((p) => !usedIds.has(p.id));
      while (result.length < 2 && candidates.length > 0) {
        const idx = Math.floor(Math.random() * candidates.length);
        const choice = candidates.splice(idx, 1)[0];
        result.push(choice);
      }
      if (result.length < 2) return;

      setPicks((prev) => ({
        ...prev,
        purple: prev.purple.map((x, idx) => (idx === 1 ? result[0] : idx === 2 ? result[1] : x)),
      }));
      setPendingSelection(null);
      setPendingMulti([]);
      // 次のターンへ: オレンジ PICK3（単体）
      gotoTurn({ team: 'orange', action: 'pick', index: 3 });
      return;
    }

    // オレンジのPICK3（単体）タイムアウト処理
    if (activeTurn.team === 'orange' && activeTurn.index === 3) {
      if (picks.orange[2]) return;

      const usedIds = new Set<string>();
      [...bans.purple, ...bans.orange, ...picks.purple, ...picks.orange].forEach((pp) => {
        if (pp) usedIds.add(pp.id);
      });
      const candidates = pokemons.filter((p) => !usedIds.has(p.id));
      if (candidates.length === 0) return;
      const preferred =
        pendingSelection && !usedIds.has(pendingSelection.id) ? pendingSelection : null;
      const choice = preferred ?? candidates[Math.floor(Math.random() * candidates.length)];

      setPicks((prev) => ({
        ...prev,
        orange: prev.orange.map((x, idx) => (idx === 2 ? choice : x)),
      }));
      setPendingSelection(null);
      // 使用禁止フェーズ2へ遷移（パープル BAN3）
      setPhase('使用禁止フェーズ2');
      gotoTurn({ team: 'purple', action: 'ban', index: 3 });
      return;
    }

    // フェーズ2: オレンジのPICK4（単体）タイムアウト処理
    if (activeTurn.team === 'orange' && activeTurn.index === 4) {
      if (picks.orange[3]) return;

      const usedIds = new Set<string>();
      [...bans.purple, ...bans.orange, ...picks.purple, ...picks.orange].forEach((pp) => {
        if (pp) usedIds.add(pp.id);
      });
      const candidates = pokemons.filter((p) => !usedIds.has(p.id));
      if (candidates.length === 0) return;
      const preferred =
        pendingSelection && !usedIds.has(pendingSelection.id) ? pendingSelection : null;
      const choice = preferred ?? candidates[Math.floor(Math.random() * candidates.length)];

      setPicks((prev) => ({
        ...prev,
        orange: prev.orange.map((x, idx) => (idx === 3 ? choice : x)),
      }));
      setPendingSelection(null);
      // 次のターンへ: パープル PICK4・PICK5
      gotoTurn({ team: 'purple', action: 'pick', index: 4 });
      return;
    }

    // フェーズ2: パープルのPICK4・PICK5（2匹）タイムアウト処理
    if (activeTurn.team === 'purple' && activeTurn.index === 4) {
      if (picks.purple[3] && picks.purple[4]) return;

      const usedIds = new Set<string>();
      [...bans.purple, ...bans.orange, ...picks.purple, ...picks.orange].forEach((pp) => {
        if (pp) usedIds.add(pp.id);
      });

      const result: Pokemon[] = [];
      pendingMulti.forEach((pp) => {
        if (!usedIds.has(pp.id) && !result.find((r) => r.id === pp.id) && result.length < 2) {
          result.push(pp);
          usedIds.add(pp.id);
        }
      });
      const candidates = pokemons.filter((p) => !usedIds.has(p.id));
      while (result.length < 2 && candidates.length > 0) {
        const idx = Math.floor(Math.random() * candidates.length);
        const choice = candidates.splice(idx, 1)[0];
        result.push(choice);
      }
      if (result.length < 2) return;

      setPicks((prev) => ({
        ...prev,
        purple: prev.purple.map((x, idx) => (idx === 3 ? result[0] : idx === 4 ? result[1] : x)),
      }));
      setPendingSelection(null);
      setPendingMulti([]);
      // 次のターンへ: オレンジ PICK5
      gotoTurn({ team: 'orange', action: 'pick', index: 5 });
      return;
    }

    // フェーズ2: オレンジのPICK5（単体）タイムアウト処理
    if (activeTurn.team === 'orange' && activeTurn.index === 5) {
      if (picks.orange[4]) return;

      const usedIds = new Set<string>();
      [...bans.purple, ...bans.orange, ...picks.purple, ...picks.orange].forEach((pp) => {
        if (pp) usedIds.add(pp.id);
      });
      const candidates = pokemons.filter((p) => !usedIds.has(p.id));
      if (candidates.length === 0) return;
      const preferred =
        pendingSelection && !usedIds.has(pendingSelection.id) ? pendingSelection : null;
      const choice = preferred ?? candidates[Math.floor(Math.random() * candidates.length)];

      setPicks((prev) => ({
        ...prev,
        orange: prev.orange.map((x, idx) => (idx === 4 ? choice : x)),
      }));
      setPendingSelection(null);
      // ここでドラフト完了
      setPhase('ドラフト完了');
      stopTimer();
      setActiveTurn(null);
      return;
    }
  }, [
    secondsLeft,
    activeTurn,
    draftStarted,
    bans,
    picks,
    pendingSelection,
    pendingMulti,
    stopTimer,
    gotoTurn,
  ]);

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
              activeHighlight={
                activeTurn?.team === 'purple'
                  ? activeTurn.action === 'pick'
                    ? activeTurn.index === 1
                      ? { type: 'pick', index: 1 }
                      : activeTurn.index === 2
                        ? [
                            { type: 'pick', index: 2 },
                            { type: 'pick', index: 3 },
                          ]
                        : activeTurn.index === 4
                          ? [
                              { type: 'pick', index: 4 },
                              { type: 'pick', index: 5 },
                            ]
                          : { type: 'pick', index: activeTurn.index }
                    : { type: activeTurn.action, index: activeTurn.index }
                  : undefined
              }
              bans={bans.purple}
              picks={picks.purple}
            />
          </div>

          <div className="panel flex flex-col items-center justify-center gap-3">
            {!draftStarted ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setDraftStarted(true);
                    setPhase('使用禁止フェーズ1');
                    gotoTurn({ team: 'purple', action: 'ban', index: 1 });
                  }}
                  className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  ドラフトピック開始
                </button>
              </>
            ) : (
              <>
                <div className="text-sm text-slate-300">現在のフェーズ</div>
                <div className="text-2xl font-bold">{phase}</div>
                <div className="text-sm text-slate-300">制限時間</div>
                <div className="text-3xl font-extrabold tabular-nums">{secondsLeft}s</div>
              </>
            )}
          </div>

          <div>
            <TeamPanel
              team="orange"
              title="オレンジチーム（後攻）"
              activeHighlight={
                activeTurn?.team === 'orange'
                  ? activeTurn.action === 'pick' && activeTurn.index === 1
                    ? [
                        { type: 'pick', index: 1 },
                        { type: 'pick', index: 2 },
                      ]
                    : { type: activeTurn.action, index: activeTurn.index }
                  : undefined
              }
              bans={bans.orange}
              picks={picks.orange}
            />
          </div>
        </section>

        <section>
          <CandidateGrid
            pokemons={pokemons}
            canConfirm={draftStarted}
            disabledIds={React.useMemo(() => {
              const ids: string[] = [];
              [...bans.purple, ...bans.orange, ...picks.purple, ...picks.orange].forEach((pp) => {
                if (pp) ids.push(pp.id);
              });
              return ids;
            }, [bans, picks])}
            onConfirm={(p) => {
              if (!activeTurn) return;
              if (activeTurn.action === 'ban') {
                // BAN1, BAN2, BAN3 の確定処理
                if (activeTurn.index !== 1 && activeTurn.index !== 2 && activeTurn.index !== 3)
                  return;
                if (activeTurn.team === 'purple') {
                  setBans((prev) => ({
                    ...prev,
                    purple: prev.purple.map((x, idx) => (idx === activeTurn.index - 1 ? p : x)),
                  }));
                  setPendingSelection(null);
                  if (activeTurn.index === 1) {
                    gotoTurn({ team: 'orange', action: 'ban', index: 1 });
                  } else if (activeTurn.index === 2) {
                    gotoTurn({ team: 'orange', action: 'ban', index: 2 });
                  } else if (activeTurn.index === 3) {
                    gotoTurn({ team: 'orange', action: 'ban', index: 3 });
                  }
                } else if (activeTurn.team === 'orange') {
                  setBans((prev) => ({
                    ...prev,
                    orange: prev.orange.map((x, idx) => (idx === activeTurn.index - 1 ? p : x)),
                  }));
                  setPendingSelection(null);
                  if (activeTurn.index === 1) {
                    gotoTurn({ team: 'purple', action: 'ban', index: 2 });
                  } else if (activeTurn.index === 2) {
                    // 使用禁止フェーズ1完了 → 使用ポケモン選択フェーズ1開始（パープル PICK1）
                    setPhase('使用ポケモン選択フェーズ1');
                    gotoTurn({ team: 'purple', action: 'pick', index: 1 });
                  } else if (activeTurn.index === 3) {
                    // 使用禁止フェーズ2完了 → 使用ポケモン選択フェーズ2開始（オレンジ PICK4）
                    setPhase('使用ポケモン選択フェーズ2');
                    gotoTurn({ team: 'orange', action: 'pick', index: 4 });
                  }
                }
              } else if (activeTurn.action === 'pick') {
                // PICK（フェーズ1: パープル1/オレンジ3、フェーズ2: オレンジ4/5）
                if (activeTurn.team === 'purple' && activeTurn.index === 1) {
                  setPicks((prev) => ({
                    ...prev,
                    purple: prev.purple.map((x, idx) => (idx === 0 ? p : x)),
                  }));
                  setPendingSelection(null);
                  // 次のターンへ: オレンジ PICK1・PICK2（1ターンで2匹）
                  gotoTurn({ team: 'orange', action: 'pick', index: 1 });
                } else if (activeTurn.team === 'orange' && activeTurn.index === 3) {
                  setPicks((prev) => ({
                    ...prev,
                    orange: prev.orange.map((x, idx) => (idx === 2 ? p : x)),
                  }));
                  setPendingSelection(null);
                  // 使用禁止フェーズ2へ遷移（パープル BAN3）
                  setPhase('使用禁止フェーズ2');
                  gotoTurn({ team: 'purple', action: 'ban', index: 3 });
                } else if (activeTurn.team === 'orange' && activeTurn.index === 4) {
                  setPicks((prev) => ({
                    ...prev,
                    orange: prev.orange.map((x, idx) => (idx === 3 ? p : x)),
                  }));
                  setPendingSelection(null);
                  // 次のターンへ: パープル PICK4・PICK5
                  gotoTurn({ team: 'purple', action: 'pick', index: 4 });
                } else if (activeTurn.team === 'orange' && activeTurn.index === 5) {
                  setPicks((prev) => ({
                    ...prev,
                    orange: prev.orange.map((x, idx) => (idx === 4 ? p : x)),
                  }));
                  setPendingSelection(null);
                  // ここでドラフト完了
                  setPhase('ドラフト完了');
                  stopTimer();
                  setActiveTurn(null);
                }
              }
            }}
            onSelect={(p) => setPendingSelection(p)}
            selectionMode={
              activeTurn?.action === 'pick' &&
              ((activeTurn.team === 'orange' && activeTurn.index === 1) ||
                (activeTurn.team === 'purple' && activeTurn.index === 2) ||
                (activeTurn.team === 'purple' && activeTurn.index === 4))
                ? 'multi2'
                : 'single'
            }
            onConfirmPair={(pair) => {
              // オレンジのPICK1・PICK2、パープルのPICK2・PICK3、パープルのPICK4・PICK5
              if (!activeTurn) return;
              if (activeTurn.action === 'pick') {
                if (activeTurn.team === 'orange' && activeTurn.index === 1) {
                  if (pair.length !== 2) return;
                  setPicks((prev) => ({
                    ...prev,
                    orange: prev.orange.map((x, idx) =>
                      idx === 0 ? pair[0] : idx === 1 ? pair[1] : x,
                    ),
                  }));
                  setPendingSelection(null);
                  setPendingMulti([]);
                  // 次のターンへ: パープル PICK2・PICK3
                  gotoTurn({ team: 'purple', action: 'pick', index: 2 });
                } else if (activeTurn.team === 'purple' && activeTurn.index === 2) {
                  if (pair.length !== 2) return;
                  setPicks((prev) => ({
                    ...prev,
                    purple: prev.purple.map((x, idx) =>
                      idx === 1 ? pair[0] : idx === 2 ? pair[1] : x,
                    ),
                  }));
                  setPendingSelection(null);
                  setPendingMulti([]);
                  // 次のターンへ: オレンジ PICK3（単体）
                  gotoTurn({ team: 'orange', action: 'pick', index: 3 });
                } else if (activeTurn.team === 'purple' && activeTurn.index === 4) {
                  if (pair.length !== 2) return;
                  setPicks((prev) => ({
                    ...prev,
                    purple: prev.purple.map((x, idx) =>
                      idx === 3 ? pair[0] : idx === 4 ? pair[1] : x,
                    ),
                  }));
                  setPendingSelection(null);
                  setPendingMulti([]);
                  // 次のターンへ: オレンジ PICK5（単体）
                  gotoTurn({ team: 'orange', action: 'pick', index: 5 });
                }
              }
            }}
            onSelectMulti={(list) => setPendingMulti(list)}
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
