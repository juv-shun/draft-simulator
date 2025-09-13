import type { RoomMock } from '@/lobby/types';

export function buildRoomUrl(room: RoomMock): string {
  const base = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
  const query = `?mode=2p&roomId=${encodeURIComponent(room.id)}`;
  return `${base}${query}`;
}

