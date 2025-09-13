export type Team = 'PURPLE' | 'ORANGE';

export type Seat = {
  uid?: string;
  displayName?: string;
};

export type Seats = Record<Team, Seat>;

export type State = {
  phase: 'lobby' | 'starting' | 'ban1' | 'pick1' | 'ban2' | 'pick2' | 'aborted' | 'finished';
  turnTeam?: Team;
  turnIndex?: number;
  deadline?: number; // epoch ms
  bans?: Record<Team, string[]>;
  picks?: Record<Team, string[]>;
  lastAction?: {
    by: Team;
    kind: 'ban' | 'pick';
    ids: string[];
  } | null;
};

export type Config = {
  turnSeconds: number; // default 15
};

export type RoomDoc = {
  hostUid: string;
  seats: Seats;
  state: State;
  config: Config;
  createdAt: FirebaseFirestore.FieldValue | number;
  updatedAt: FirebaseFirestore.FieldValue | number;
  version: number;
};

