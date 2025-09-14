import React from 'react';
import type { RoomMock, SeatMock } from '@/lobby/types';
import type { Team } from '@/types';

export function useOptimisticSeats(remoteRoom: RoomMock | null, uid: string | null) {
  const [optimistic, setOptimistic] = React.useState<{ purple?: SeatMock; orange?: SeatMock }>({});

  const roomForView = React.useMemo<RoomMock | null>(() => {
    if (!remoteRoom) return null;
    if (!optimistic.purple && !optimistic.orange) return remoteRoom;
    return {
      ...remoteRoom,
      seats: {
        purple: optimistic.purple ?? remoteRoom.seats.purple,
        orange: optimistic.orange ?? remoteRoom.seats.orange,
      },
    } as RoomMock;
  }, [remoteRoom, optimistic]);

  // サーバ値と一致したら楽観的状態をクリア
  React.useEffect(() => {
    if (!remoteRoom) return;
    setOptimistic((cur) => {
      if (!cur.purple && !cur.orange) return cur;
      const next: { purple?: SeatMock; orange?: SeatMock } = { ...cur };
      if (cur.purple && remoteRoom.seats.purple.uid === cur.purple.uid) delete next.purple;
      if (cur.orange && remoteRoom.seats.orange.uid === cur.orange.uid) delete next.orange;
      return next;
    });
  }, [remoteRoom]);

  return { roomForView, optimistic, setOptimistic } as const;
}

export default useOptimisticSeats;
