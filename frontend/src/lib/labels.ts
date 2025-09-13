import type { Team } from '@/types';

export function teamTitle(team: Team): string {
  return team === 'purple' ? '先攻' : '後攻';
}

export function teamGradientClass(team: Team): string {
  return team === 'purple' ? 'from-fuchsia-500 to-purple-600' : 'from-amber-400 to-orange-500';
}

export function teamRingClass(team: Team): string {
  return team === 'purple' ? 'ring-fuchsia-300' : 'ring-amber-300';
}
