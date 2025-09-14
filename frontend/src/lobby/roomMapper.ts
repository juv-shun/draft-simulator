import type { DocumentData } from 'firebase/firestore';
import type { Team } from '@/types';
import type { RoomMock, SeatMock } from '@/lobby/types';

function toSeatMock(raw: any): SeatMock {
  const uid = (raw?.uid ?? null) as string | null;
  const displayNameRaw = raw?.displayName;
  const displayName =
    typeof displayNameRaw === 'string' ? displayNameRaw : (displayNameRaw ?? null);
  const occupied = Boolean(uid);
  return { occupied, displayName, uid };
}

export function mapRoom(docId: string, data: DocumentData): RoomMock | null {
  if (!data) return null;
  const seatsRaw = data.seats ?? {};
  const purpleRaw = seatsRaw.PURPLE ?? seatsRaw.purple ?? {};
  const orangeRaw = seatsRaw.ORANGE ?? seatsRaw.orange ?? {};

  const turnSeconds = Number(data?.config?.turnSeconds ?? 15);
  const createdAtValue = data?.createdAt;
  let createdAt = Date.now();
  if (typeof createdAtValue === 'number') createdAt = createdAtValue;
  else if (createdAtValue?.toMillis) createdAt = createdAtValue.toMillis();

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
