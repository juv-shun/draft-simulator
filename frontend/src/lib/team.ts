import type { Team as ClientTeam } from '@/types';

export type ServerTeam = 'PURPLE' | 'ORANGE';

export function toServerTeam(team: ClientTeam): ServerTeam {
  return team === 'purple' ? 'PURPLE' : 'ORANGE';
}

export function toClientTeam(team: ServerTeam): ClientTeam {
  return team === 'PURPLE' ? 'purple' : 'orange';
}
