import React from 'react';

type Props = {
  text: string;
  className?: string;
};

const CopyToClipboardButton: React.FC<Props> = ({ text, className }) => {
  const [copied, setCopied] = React.useState(false);
  const onCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // noop
    }
  };
  return (
    <button
      type="button"
      onClick={onCopy}
      className={
        'rounded-md border px-2 py-1 text-xs ' +
        (copied
          ? 'border-emerald-400 bg-emerald-500/20 text-emerald-100 '
          : 'border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700/60') +
        (className ? ` ${className}` : '')
      }
      title={copied ? 'コピーしました' : 'クリップボードにコピー'}
    >
      {copied ? 'コピー済み' : 'コピー'}
    </button>
  );
};

export default CopyToClipboardButton;
