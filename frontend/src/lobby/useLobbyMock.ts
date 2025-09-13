import React from 'react';
import type { Team } from '@/types';
import type { RoomMock, SeatMock } from './types';

function randomId(prefix: string = ''): string {
  return prefix + Math.random().toString(36).slice(2, 10);
}

function createSeat(): SeatMock {
  return {
    occupied: false,
    displayName: null,
  };
}

export function useLobbyMock() {
  const [room, setRoom] = React.useState<RoomMock | null>(null);
  const myUid = React.useMemo<string>(() => {
    try {
      const key = 'mock_uid';
      const existing = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
      if (existing) return existing;
      const uid = randomId('u_');
      if (typeof window !== 'undefined') window.localStorage.setItem(key, uid);
      return uid;
    } catch {
      return randomId('u_');
    }
  }, []);

  const createRoom = React.useCallback((turnSeconds: number = 15): RoomMock => {
    const r: RoomMock = {
      id: randomId('room_'),
      seats: {
        purple: createSeat(),
        orange: createSeat(),
      },
      state: 'lobby',
      config: { turnSeconds },
      createdAt: Date.now(),
    };
    setRoom(r);
    return r;
  }, []);

  const claimSeat = React.useCallback((team: Team, name?: string) => {
    setRoom((cur) => {
      if (!cur) return cur;
      const trimmed = (name ?? '').trim();
      if (!trimmed) return cur; // 表示名が空の場合は着席不可
      if (cur.seats[team].occupied) return cur;
      const other: Team = team === 'purple' ? 'orange' : 'purple';
      // 同一ユーザーによる両席着席を禁止
      if (cur.seats[other].uid && cur.seats[other].uid === myUid) return cur;
      return {
        ...cur,
        seats: {
          ...cur.seats,
          [team]: {
            ...cur.seats[team],
            occupied: true,
            displayName: trimmed,
            uid: myUid,
          },
        },
      };
    });
  }, [myUid]);

  const leaveSeat = React.useCallback((team: Team) => {
    setRoom((cur) => {
      if (!cur) return cur;
      return {
        ...cur,
        seats: {
          ...cur.seats,
          [team]: { ...cur.seats[team], occupied: false, uid: null },
        },
      };
    });
  }, []);

  const setDisplayName = React.useCallback((team: Team, name: string) => {
    setRoom((cur) => {
      if (!cur) return cur;
      return {
        ...cur,
        seats: {
          ...cur.seats,
          [team]: { ...cur.seats[team], displayName: name },
        },
      };
    });
  }, []);

  const canStart = Boolean(room && room.seats.purple.occupied && room.seats.orange.occupied);

  return {
    room,
    setRoom,
    createRoom,
    claimSeat,
    leaveSeat,
    setDisplayName,
    canStart,
    myUid,
  } as const;
}

export default useLobbyMock;
