export type Team = 'purple' | 'orange';

export type PhaseKey =
  | 'ban_phase_1'
  | 'pick_phase_1'
  | 'ban_phase_2'
  | 'pick_phase_2'
  | 'completed';

export type ActionType = 'ban' | 'pick';

export type Turn = {
  team: Team;
  action: ActionType;
  index: number; // 1-based within action type
};

export type DraftState<TPokemon> = {
  phase: PhaseKey;
  draftStarted: boolean;
  secondsLeft: number; // remaining seconds for current turn
  activeTurn: Turn | null;
  bans: { purple: (TPokemon | null)[]; orange: (TPokemon | null)[] };
  picks: { purple: (TPokemon | null)[]; orange: (TPokemon | null)[] };
};

export type SelectionMode = 'single' | 'multi2';

export type DraftController<TPokemon> = {
  state: DraftState<TPokemon>;
  // UI derived
  phaseLabel: string;
  disabledIds: string[];
  selectionMode: SelectionMode;
  canConfirm: boolean;
  isSpectator?: boolean; // 2Pリモート時の観戦者判定
  highlights: {
    purple: ({ type: ActionType; index: number } | { type: ActionType; index: number }[]) | null;
    orange: ({ type: ActionType; index: number } | { type: ActionType; index: number }[]) | null;
  };
  // operations
  start: () => void;
  select: (pokemon: TPokemon | null) => void;
  selectMulti: (list: TPokemon[]) => void;
  confirm: (pokemon?: TPokemon) => void;
  confirmPair: (list: TPokemon[]) => void;
};
