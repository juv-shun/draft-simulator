import React from 'react';
import LobbySeatCard from './LobbySeatCard';
import type { RoomMock } from '@/lobby/types';

type Props = {
  room: RoomMock;
  uid: string | null;
  canLeaveOtherSeat: boolean; // ホスト権限
  spectator?: boolean; // 満席かつ未着席
  onClaim: (team: 'purple' | 'orange', name: string) => Promise<void> | void;
  onLeave: (team: 'purple' | 'orange') => Promise<void> | void;
  onChangeName?: (team: 'purple' | 'orange', name: string) => void;
};

const SeatsGrid: React.FC<Props> = ({ room, uid, canLeaveOtherSeat, spectator = false, onClaim, onLeave, onChangeName }) => {
  const isHost = canLeaveOtherSeat;
  const canLeavePurple = isHost || room.seats.purple.uid === uid;
  const canLeaveOrange = isHost || room.seats.orange.uid === uid;
  const leaveReason = isHost ? undefined : '自分の席以外は離席できません（ホストのみ可能）';
  const disableAllClaim = spectator;
  const nameReadOnly = spectator;

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
        disableClaim={disableAllClaim || room.seats.orange.uid === uid}
        disableClaimReason={
          disableAllClaim ? '現在満席のため着席できません' : '同一ユーザーは両席に着席できません'
        }
        nameReadOnly={nameReadOnly}
      />
      <LobbySeatCard
        team="orange"
        seat={room.seats.orange}
        onClaim={(name) => onClaim('orange', name ?? '')}
        onLeave={() => onLeave('orange')}
        onChangeName={(name) => onChangeName?.('orange', name)}
        canLeave={canLeaveOrange}
        leaveDisabledReason={leaveReason}
        disableClaim={disableAllClaim || room.seats.purple.uid === uid}
        disableClaimReason={
          disableAllClaim ? '現在満席のため着席できません' : '同一ユーザーは両席に着席できません'
        }
        nameReadOnly={nameReadOnly}
      />
    </div>
  );
};

export default SeatsGrid;
