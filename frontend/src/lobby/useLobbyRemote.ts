import React from 'react';
import { doc, onSnapshot, type DocumentData } from 'firebase/firestore';
import type { RoomMock } from '@/lobby/types';
import { getFirestoreDb } from '@/lib/firebase';
import { mapRoom } from '@/lobby/roomMapper';

export function useLobbyRemote(roomId: string | null) {
  const [room, setRoom] = React.useState<RoomMock | null>(null);
  const [loading, setLoading] = React.useState<boolean>(Boolean(roomId));
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!roomId) {
      setRoom(null);
      setLoading(false);
      setError(null);
      return;
    }
    const db = getFirestoreDb();
    const ref = doc(db, 'rooms', roomId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setRoom(null);
          setError('ロビーが見つかりません');
          setLoading(false);
          return;
        }
        const mapped = mapRoom(snap.id, snap.data() as DocumentData);
        setRoom(mapped);
        setError(null);
        setLoading(false);
      },
      (e) => {
        setError(e?.message ?? 'ロビーの購読に失敗しました');
        setLoading(false);
      },
    );
    return () => unsub();
  }, [roomId]);

  return { room, loading, error } as const;
}

export default useLobbyRemote;
