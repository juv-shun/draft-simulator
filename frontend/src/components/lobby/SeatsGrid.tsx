import React from 'react';
import LobbySeatCard from './LobbySeatCard';
import type { RoomMock } from '@/lobby/types';

type Props = {
  room: RoomMock;
  uid: string | null;
  canLeaveOtherSeat: boolean; // ホスト権限
  onClaim: (team: 'purple' | 'orange', name: string) => Promise<void> | void;
  onLeave: (team: 'purple' | 'orange') => Promise<void> | void;
  onChangeName?: (team: 'purple' | 'orange', name: string) => void;
};

const SeatsGrid: React.FC<Props> = ({ room, uid, canLeaveOtherSeat, onClaim, onLeave, onChangeName }) => {
  const isHost = canLeaveOtherSeat;
  const canLeavePurple = isHost || room.seats.purple.uid === uid;
  const canLeaveOrange = isHost || room.seats.orange.uid === uid;
  const leaveReason = isHost ? undefined : '自分の席以外は離席できません（ホストのみ可能）';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <LobbySeatCard
        team="purple"
        seat={room.seats.purple}
        onClaim={(name) => onClaim('purple', name ?? '')}
        onLeave={() => onLeave('purple')}
        onChangeName={(name) => onChangeName?.('purple', name)}
        canLeave={canLeavePurple}
        leaveDisabledReason={leaveReason}
        disableClaim={room.seats.orange.uid === uid}
        disableClaimReason="同一ユーザーは両席に着席できません"
      />
      <LobbySeatCard
        team="orange"
        seat={room.seats.orange}
        onClaim={(name) => onClaim('orange', name ?? '')}
        onLeave={() => onLeave('orange')}
        onChangeName={(name) => onChangeName?.('orange', name)}
        canLeave={canLeaveOrange}
        leaveDisabledReason={leaveReason}
        disableClaim={room.seats.purple.uid === uid}
        disableClaimReason="同一ユーザーは両席に着席できません"
      />
    </div>
  );
};

export default SeatsGrid;

