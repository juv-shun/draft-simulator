import React from 'react';
import { doc, onSnapshot, type DocumentData } from 'firebase/firestore';
import type { Team } from '@/types';
import type { RoomMock, SeatMock } from '@/lobby/types';
import { getFirestoreDb } from '@/lib/firebase';

function toSeatMock(raw: any): SeatMock {
  const uid = (raw?.uid ?? null) as string | null;
  const displayNameRaw = raw?.displayName;
  const displayName = typeof displayNameRaw === 'string' ? displayNameRaw : displayNameRaw ?? null;
  const occupied = Boolean(uid);
  return { occupied, displayName, uid };
}

function mapRoom(docId: string, data: DocumentData): RoomMock | null {
  if (!data) return null;
  // モデルでは大文字キー想定（PURPLE/ORANGE）。なければ小文字からも拾う。
  const seatsRaw = data.seats ?? {};
  const purpleRaw = seatsRaw.PURPLE ?? seatsRaw.purple ?? {};
  const orangeRaw = seatsRaw.ORANGE ?? seatsRaw.orange ?? {};

  const turnSeconds = Number(data?.config?.turnSeconds ?? 15);
  const createdAtValue = data?.createdAt;
  let createdAt = Date.now();
  if (typeof createdAtValue === 'number') createdAt = createdAtValue;
  else if (createdAtValue?.toMillis) createdAt = createdAtValue.toMillis();

  // state はフェーズ3では 'lobby' で十分
  const state: 'lobby' | 'starting' = (data?.state as any) ?? 'lobby';

  const room: RoomMock = {
    id: docId,
    seats: {
      purple: toSeatMock(purpleRaw),
      orange: toSeatMock(orangeRaw),
    } as Record<Team, SeatMock>,
    state,
    config: { turnSeconds },
    createdAt,
    hostUid: (data?.hostUid ?? null) as string | null,
  };
  return room;
}

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
        const mapped = mapRoom(snap.id, snap.data());
        setRoom(mapped);
        setError(null);
        setLoading(false);
      },
      (e) => {
        setError(e?.message ?? 'ロビーの購読に失敗しました');
        setLoading(false);
      }
    );
    return () => unsub();
  }, [roomId]);

  return { room, loading, error } as const;
}

export default useLobbyRemote;
