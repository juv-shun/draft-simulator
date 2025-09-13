import React from 'react';
import { signInAnonymously, onAuthStateChanged, type User } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase';

export function useAnonAuth(enabled: boolean) {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState<boolean>(enabled);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setUser(null);
      setError(null);
      return;
    }
    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    // 既にサインイン済みでなければ匿名でサインイン
    if (!auth.currentUser) {
      signInAnonymously(auth).catch((e) => {
        setError(e?.message ?? '匿名サインインに失敗しました');
        setLoading(false);
      });
    }
    return () => unsub();
  }, [enabled]);

  return {
    user,
    uid: user?.uid ?? null,
    loading,
    error,
  } as const;
}

export default useAnonAuth;

