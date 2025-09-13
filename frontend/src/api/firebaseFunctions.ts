import { httpsCallable } from 'firebase/functions';
import { getFunctionsClient } from '@/lib/firebase';
import type { Team } from '@/types';
import { toServerTeam } from '@/lib/team';
import type { CreateRoomResponse, OkResponse, StartDraftResponse } from '@/api/types';

export async function apiCreateRoom(turnSeconds?: number): Promise<CreateRoomResponse> {
  const fns = getFunctionsClient();
  const call = httpsCallable<{ turnSeconds?: number }, CreateRoomResponse>(fns, 'createRoom');
  const res = await call({ turnSeconds });
  return res.data;
}

export async function apiClaimSeat(roomId: string, team: Team, displayName: string): Promise<void> {
  const fns = getFunctionsClient();
  const call = httpsCallable<{ roomId: string; team: 'PURPLE' | 'ORANGE'; displayName: string }, OkResponse>(
    fns,
    'claimSeat'
  );
  await call({ roomId, team: toServerTeam(team), displayName });
}

export async function apiStartDraft(roomId: string): Promise<StartDraftResponse> {
  const fns = getFunctionsClient();
  const call = httpsCallable<{ roomId: string }, StartDraftResponse>(fns, 'startDraft');
  const res = await call({ roomId });
  return res.data;
}

export async function apiLeaveSeat(roomId: string, team: Team): Promise<void> {
  const fns = getFunctionsClient();
  const call = httpsCallable<{ roomId: string; team: 'PURPLE' | 'ORANGE' }, OkResponse>(fns, 'leaveSeat');
  await call({ roomId, team: toServerTeam(team) });
}
