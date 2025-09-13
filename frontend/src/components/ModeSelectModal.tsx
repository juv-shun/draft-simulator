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
          <h2 className="text-lg font-semibold">ゲームモード選択</h2>
        </div>
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
