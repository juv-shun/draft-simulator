import type { Team } from '@/types';

export type SeatMock = {
  occupied: boolean;
  displayName: string | null;
  uid?: string | null;
};

export type RoomMock = {
  id: string;
  seats: Record<Team, SeatMock>;
  state: 'lobby' | 'starting';
  config: { turnSeconds: number };
  createdAt: number;
};
