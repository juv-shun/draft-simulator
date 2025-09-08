import type { Pokemon } from '@/types';
import React from 'react';
// 遅延読み込みコンポーネントを先に宣言
const TeamPanel = React.lazy(() => import('./components/TeamPanel'));
const CandidateGrid = React.lazy(() => import('./components/CandidateGrid'));
// Viteのfs.allowにより、上位のdocsからJSONをインポート（ビルド時取り込み）
// 相対パスは src -> frontend -> docs （リポジトリ直下）
import pokemonsData from '../../docs/pokemons.json';

const pokemons = pokemonsData as Pokemon[];

const App: React.FC = () => {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur supports-[backdrop-filter]:bg-slate-900/50">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <h1 className="text-xl font-bold">ポケモンユナイト 3BAN ドラフトピッカー(α)</h1>
          <p className="text-sm text-slate-400">デモ: 画面のみ（操作ロジック未実装）</p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 space-y-6">
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div>
            <TeamPanel team="purple" title="パープルチーム（先攻）" />
          </div>

          <div className="panel flex flex-col items-center justify-center gap-3">
            <div className="text-sm text-slate-300">現在の手番</div>
            <div className="text-2xl font-bold">—</div>
            <div className="text-sm text-slate-300">制限時間</div>
            <div className="text-3xl font-extrabold tabular-nums">15s</div>
            <div className="text-xs text-slate-500">操作ロジックは後で実装</div>
          </div>

          <div>
            <TeamPanel team="orange" title="オレンジチーム（後攻）" />
          </div>
        </section>

        <section>
          <CandidateGrid pokemons={pokemons} />
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
