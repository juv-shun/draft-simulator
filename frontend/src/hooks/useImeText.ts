import React from 'react';

export function useImeText(initial: string = '') {
  const [value, setValue] = React.useState<string>(initial);
  const [composing, setComposing] = React.useState<boolean>(false);

  const onChange = React.useCallback((next: string) => {
    setValue(next);
  }, []);

  const onCompositionStart = React.useCallback(() => setComposing(true), []);
  const onCompositionEnd = React.useCallback(() => setComposing(false), []);

  return { value, setValue, composing, onChange, onCompositionStart, onCompositionEnd } as const;
}

export default useImeText;

