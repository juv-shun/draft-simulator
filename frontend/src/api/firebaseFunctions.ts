import { httpsCallable } from 'firebase/functions';
import { getFunctionsClient } from '@/lib/firebase';
import type { Team } from '@/types';
import { toServerTeam } from '@/lib/team';

export async function apiCreateRoom(turnSeconds?: number): Promise<{ roomId: string }> {
  const fns = getFunctionsClient();
  const call = httpsCallable<{ turnSeconds?: number }, { roomId: string }>(fns, 'createRoom');
  const res = await call({ turnSeconds });
  return res.data;
}

export async function apiClaimSeat(roomId: string, team: Team, displayName: string): Promise<void> {
  const fns = getFunctionsClient();
  const call = httpsCallable<{ roomId: string; team: 'PURPLE' | 'ORANGE'; displayName: string }, { ok: true }>(
    fns,
    'claimSeat'
  );
  await call({ roomId, team: toServerTeam(team), displayName });
}

export async function apiStartDraft(roomId: string): Promise<{ ok: true; deadline: number; turnIndex: number }> {
  const fns = getFunctionsClient();
  const call = httpsCallable<{ roomId: string }, { ok: true; deadline: number; turnIndex: number }>(fns, 'startDraft');
  const res = await call({ roomId });
  return res.data;
}

export async function apiLeaveSeat(roomId: string, team: Team): Promise<void> {
  const fns = getFunctionsClient();
  const call = httpsCallable<{ roomId: string; team: 'PURPLE' | 'ORANGE' }, { ok: true }>(fns, 'leaveSeat');
  await call({ roomId, team: toServerTeam(team) });
}
