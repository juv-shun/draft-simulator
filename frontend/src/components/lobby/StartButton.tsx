import React from 'react';

type Props = {
  disabled: boolean;
  onClick: () => void | Promise<void>;
  titleWhenDisabled?: string;
};

const StartButton: React.FC<Props> = ({ disabled, onClick, titleWhenDisabled }) => {
  return (
    <div className="flex items-center justify-center gap-3">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow enabled:hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed"
        title={disabled ? titleWhenDisabled : undefined}
      >
        ドラフト開始
      </button>
    </div>
  );
};

export default StartButton;
