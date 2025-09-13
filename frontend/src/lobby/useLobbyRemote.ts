import React from 'react';
import {
  doc,
  onSnapshot,
  type DocumentData,
  collection,
  addDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import type { Team } from '@/types';
import type { RoomMock, SeatMock } from '@/lobby/types';
import { getFirestoreDb } from '@/lib/firebase';
import { getFirebaseAuth } from '@/lib/firebase';

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
  };
  return room;
}

export function useLobbyRemote(roomId: string | null) {
  const [room, setRoom] = React.useState<RoomMock | null>(null);
  const [loading, setLoading] = React.useState<boolean>(Boolean(roomId));
  const [error, setError] = React.useState<string | null>(null);
  const devWritesEnabled = (import.meta.env.VITE_DEV_CLIENT_WRITES as string) === 'true';

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

  // 開発用: クライアント直書きで部屋作成/着席を可能にする（Emulator前提）
  const createRoomDev = React.useCallback(
    async (turnSeconds: number = 15): Promise<string> => {
      if (!devWritesEnabled) throw new Error('開発用クライアント書き込みが無効です');
      const db = getFirestoreDb();
      const auth = getFirebaseAuth();
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error('認証が未完了です');
      const ref = await addDoc(collection(db, 'rooms'), {
        hostUid: uid,
        seats: { PURPLE: {}, ORANGE: {} },
        state: 'lobby',
        config: { turnSeconds },
        createdAt: serverTimestamp(),
      });
      return ref.id;
    },
    [devWritesEnabled]
  );

  const claimSeatDev = React.useCallback(
    async (team: Team, displayName: string) => {
      if (!devWritesEnabled) throw new Error('開発用クライアント書き込みが無効です');
      if (!roomId) throw new Error('roomId がありません');
      const db = getFirestoreDb();
      const auth = getFirebaseAuth();
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error('認証が未完了です');
      const key = team === 'purple' ? 'PURPLE' : 'ORANGE';
      await updateDoc(doc(db, 'rooms', roomId), {
        [`seats.${key}.uid`]: uid,
        [`seats.${key}.displayName`]: displayName,
      });
    },
    [devWritesEnabled, roomId]
  );

  const leaveSeatDev = React.useCallback(
    async (team: Team) => {
      if (!devWritesEnabled) throw new Error('開発用クライアント書き込みが無効です');
      if (!roomId) throw new Error('roomId がありません');
      const db = getFirestoreDb();
      const key = team === 'purple' ? 'PURPLE' : 'ORANGE';
      await updateDoc(doc(db, 'rooms', roomId), {
        [`seats.${key}.uid`]: null,
      });
    },
    [devWritesEnabled, roomId]
  );

  const setDisplayNameDev = React.useCallback(
    async (team: Team, name: string) => {
      if (!devWritesEnabled) throw new Error('開発用クライアント書き込みが無効です');
      if (!roomId) throw new Error('roomId がありません');
      const db = getFirestoreDb();
      const key = team === 'purple' ? 'PURPLE' : 'ORANGE';
      await updateDoc(doc(db, 'rooms', roomId), {
        [`seats.${key}.displayName`]: name,
      });
    },
    [devWritesEnabled, roomId]
  );

  return { room, loading, error, createRoomDev, claimSeatDev, leaveSeatDev, setDisplayNameDev, devWritesEnabled } as const;
}

export default useLobbyRemote;
