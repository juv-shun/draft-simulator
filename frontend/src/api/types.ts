export type CreateRoomResponse = {
  roomId: string;
};

export type StartDraftResponse = {
  ok: true;
  deadline: number;
  turnIndex: number;
};

export type OkResponse = { ok: true };

