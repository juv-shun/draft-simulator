import React from 'react';

type Props = {
  open: boolean;
  onSelect1P: () => void;
  onSelect2P: () => void;
};

const Overlay: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
    <div className="relative z-10 w-full max-w-md p-4">{children}</div>
  </div>
);

const ModeSelectModal: React.FC<Props> = ({ open, onSelect1P, onSelect2P }) => {
  if (!open) return null;
  return (
    <Overlay>
      <div className="panel space-y-4">
        <div className="flex items-center">
          <h2 className="text-lg font-semibold">本アプリケーションの概要</h2>
        </div>
        <div className="rounded-md border border-slate-700 bg-slate-800/60 p-3 text-sm leading-relaxed text-slate-200">
          <p className="mb-2">
            このアプリは、ポケモンユナイトの「3BANドラフト」を手軽に体験・練習できるアプリケーションです。
          </p>
          <div className="mb-3 rounded-md border border-amber-600 bg-amber-900/30 p-3 text-amber-100">
            <div className="mb-1 text-xs font-semibold tracking-wide text-amber-200">
              本アプリの特徴
            </div>
            <ul className="list-disc pl-5 space-y-1">
              <li>同時BANではなく、交互BANを採用</li>
              <li>PICKの途中でBANフェーズ2へ切り替え</li>
            </ul>
          </div>
          <ul className="list-disc pl-5 space-y-1 text-slate-300">
            <li>1人プレイ: 自身でパープルチームとオレンジチームのどちらもピックするモード</li>
            <li>2人プレイ: ロビーを作成し URL 共有で対戦形式で行うモード</li>
          </ul>
          <p className="mt-2 text-xs text-slate-400">
            注意: 本アプリはポケモンユナイトのゲーム内に実装された時点で廃止します。
          </p>
        </div>
        <h2 className="text-lg font-semibold">ゲームモード選択</h2>
        <div className="grid grid-cols-1 gap-3">
          <button
            type="button"
            onClick={onSelect1P}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            1人プレイ（ドラフト開始）
          </button>
          <button
            type="button"
            onClick={onSelect2P}
            className="rounded-md bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            2人プレイ（ロビー作成）
          </button>
        </div>
      </div>
    </Overlay>
  );
};

export default ModeSelectModal;
