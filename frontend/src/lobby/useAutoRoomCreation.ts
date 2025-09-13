import React from 'react';
import { apiCreateRoom } from '@/api/firebaseFunctions';

type Options = {
  enabled: boolean;
  roomId: string | null;
  authLoading: boolean;
  uid: string | null;
  onCreated: (id: string) => void;
};

export function useAutoRoomCreation({ enabled, roomId, authLoading, uid, onCreated }: Options) {
  const creatingRef = React.useRef(false);
  React.useEffect(() => {
    if (!enabled) return;
    if (roomId) return;
    if (authLoading || !uid) return;
    if (creatingRef.current) return;
    const guardKey = 'ds_auto_create_guard';
    const now = Date.now();
    try {
      const guard = typeof window !== 'undefined' ? window.sessionStorage.getItem(guardKey) : null;
      if (guard) {
        const [status, tsStr] = guard.split(':');
        const ts = Number(tsStr || '0');
        if (status === 'creating' && now - ts < 10000) return;
      }
      if (typeof window !== 'undefined') window.sessionStorage.setItem(guardKey, `creating:${now}`);
    } catch {}
    creatingRef.current = true;
    (async () => {
      try {
        const res = await apiCreateRoom(15);
        const id = res.roomId;
        if (typeof window !== 'undefined') {
          const base = window.location.origin + window.location.pathname;
          const next = `${base}?mode=2p&roomId=${encodeURIComponent(id)}`;
          window.history.replaceState(null, '', next);
        }
        onCreated(id);
        try {
          if (typeof window !== 'undefined') window.sessionStorage.setItem(guardKey, `created:${Date.now()}`);
        } catch {}
      } catch (e) {
        creatingRef.current = false;
        try {
          if (typeof window !== 'undefined') window.sessionStorage.removeItem(guardKey);
        } catch {}
      }
    })();
  }, [enabled, roomId, authLoading, uid, onCreated]);
}

export default useAutoRoomCreation;

