import React from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { getFirestoreDb } from '@/lib/firebase';
import { useAnonAuth } from '@/auth/useAnonAuth';
import { apiApplyAction } from '@/api/firebaseFunctions';
import type { Pokemon } from '@/types';
import type { DraftController, DraftState, SelectionMode } from './types';

type ServerTeam = 'PURPLE' | 'ORANGE';
type ServerPhase = 'lobby' | 'starting' | 'ban1' | 'pick1' | 'ban2' | 'pick2' | 'aborted' | 'finished';

type ServerState = {
  phase: ServerPhase;
  turnTeam?: ServerTeam;
  turnIndex?: number;
  deadline?: number; // epoch ms
  bans?: Record<ServerTeam, string[]>;
  picks?: Record<ServerTeam, string[]>;
};

function getRoomIdFromLocation(): string | null {
  if (typeof window === 'undefined') return null;
  const sp = new URLSearchParams(window.location.search);
  return sp.get('roomId');
}

const phaseLabelOf = (p: ServerPhase): string => {
  switch (p) {
    case 'ban1':
      return '使用禁止フェーズ1';
    case 'pick1':
      return '使用ポケモン選択フェーズ1';
    case 'ban2':
      return '使用禁止フェーズ2';
    case 'pick2':
      return '使用ポケモン選択フェーズ2';
    case 'finished':
      return 'ドラフト完了';
    case 'aborted':
      return 'ドラフト終了';
    default:
      return '—';
  }
};

export function useDraftControllerRemote(allPokemons: Pokemon[]): DraftController<Pokemon> {
  const [roomId, setRoomId] = React.useState<string | null>(getRoomIdFromLocation());
  React.useEffect(() => {
    setRoomId(getRoomIdFromLocation());
  }, []);

  // URL (roomId) は replaceState で更新されるためイベントが発火しない。
  // 簡易にポーリングして反映する（UI負荷を避け300ms）。
  React.useEffect(() => {
    let last = getRoomIdFromLocation();
    const h = window.setInterval(() => {
      const cur = getRoomIdFromLocation();
      if (cur && cur !== last) {
        last = cur;
        setRoomId(cur);
      }
    }, 300);
    return () => window.clearInterval(h);
  }, []);

  const auth = useAnonAuth(Boolean(roomId));

  const [serverState, setServerState] = React.useState<ServerState | null>(null);
  const [myTeam, setMyTeam] = React.useState<ServerTeam | null>(null);
  const [secondsLeft, setSecondsLeft] = React.useState<number>(15);
  const [phaseLabel, setPhaseLabel] = React.useState<string>('—');
  const [pendingSelection, setPendingSelection] = React.useState<Pokemon | null>(null);
  const [pendingMulti, setPendingMulti] = React.useState<Pokemon[]>([]);

  const idMap = React.useMemo(() => {
    const m = new Map<string, Pokemon>();
    allPokemons.forEach((p) => m.set(p.id, p));
    return m;
  }, [allPokemons]);

  // Subscribe room state
  React.useEffect(() => {
    if (!roomId) {
      setServerState(null);
      setMyTeam(null);
      return;
    }
    const db = getFirestoreDb();
    const ref = doc(db, 'rooms', roomId);
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) {
        setServerState(null);
        setMyTeam(null);
        return;
      }
      const data = snap.data() as any;
      const state = (data?.state ?? null) as ServerState | null;
      setServerState(state);
      setPhaseLabel(state ? phaseLabelOf(state.phase) : '—');

      // 自分のチームを seats から判定（最新の uid を使用）
      const purpleUid = data?.seats?.PURPLE?.uid as string | undefined;
      const orangeUid = data?.seats?.ORANGE?.uid as string | undefined;
      const uid = auth.uid; // useAnonAuth の最新値
      if (uid && uid === purpleUid) setMyTeam('PURPLE');
      else if (uid && uid === orangeUid) setMyTeam('ORANGE');
      else setMyTeam(null);
    });
    return () => unsub();
  }, [roomId, auth.uid]);

  // countdown from deadline
  React.useEffect(() => {
    const handle = window.setInterval(() => {
      const dl = serverState?.deadline ?? null;
      if (!dl) {
        setSecondsLeft(15);
        return;
      }
      const left = Math.max(0, Math.ceil((dl - Date.now()) / 1000));
      setSecondsLeft(left);
    }, 500);
    return () => window.clearInterval(handle);
  }, [serverState?.deadline]);

  const bansMapped = React.useMemo(() => {
    const bans = serverState?.bans ?? { PURPLE: [], ORANGE: [] };
    const toLen = (arr: string[], n: number): (Pokemon | null)[] => {
      const mapped = arr.map((id) => idMap.get(id) ?? null);
      if (mapped.length < n) return [...mapped, ...Array(n - mapped.length).fill(null)];
      return mapped.slice(0, n);
    };
    return {
      purple: toLen(bans.PURPLE, 3),
      orange: toLen(bans.ORANGE, 3),
    } as DraftState<Pokemon>['bans'];
  }, [serverState?.bans, idMap]);

  const picksMapped = React.useMemo(() => {
    const picks = serverState?.picks ?? { PURPLE: [], ORANGE: [] };
    const toLen = (arr: string[], n: number): (Pokemon | null)[] => {
      const mapped = arr.map((id) => idMap.get(id) ?? null);
      if (mapped.length < n) return [...mapped, ...Array(n - mapped.length).fill(null)];
      return mapped.slice(0, n);
    };
    return {
      purple: toLen(picks.PURPLE, 5),
      orange: toLen(picks.ORANGE, 5),
    } as DraftState<Pokemon>['picks'];
  }, [serverState?.picks, idMap]);

  const disabledIds = React.useMemo<string[]>(() => {
    const set = new Set<string>();
    (serverState?.bans?.PURPLE ?? []).forEach((id) => set.add(id));
    (serverState?.bans?.ORANGE ?? []).forEach((id) => set.add(id));
    (serverState?.picks?.PURPLE ?? []).forEach((id) => set.add(id));
    (serverState?.picks?.ORANGE ?? []).forEach((id) => set.add(id));
    return Array.from(set);
  }, [serverState?.bans, serverState?.picks]);

  // selectionMode by expected count
  const selectionMode: SelectionMode = React.useMemo(() => {
    if (!serverState) return 'single';
    const pb = serverState.bans?.PURPLE?.length ?? 0;
    const ob = serverState.bans?.ORANGE?.length ?? 0;
    const pp = serverState.picks?.PURPLE?.length ?? 0;
    const op = serverState.picks?.ORANGE?.length ?? 0;
    switch (serverState.phase) {
      case 'pick1':
        if (pp < 1) return 'single';
        if (op < 2) return 'multi2';
        if (pp < 3) return 'multi2';
        return 'single';
      case 'pick2':
        if (op < 4) return 'single';
        if (pp < 5) return 'multi2';
        return 'single';
      default:
        return 'single';
    }
  }, [serverState]);

  // highlights similar to local
  const highlights = React.useMemo<DraftController<Pokemon>['highlights']>(() => {
    if (!serverState) return { purple: null, orange: null };
    const pb = serverState.bans?.PURPLE?.length ?? 0;
    const ob = serverState.bans?.ORANGE?.length ?? 0;
    const pp = serverState.picks?.PURPLE?.length ?? 0;
    const op = serverState.picks?.ORANGE?.length ?? 0;
    switch (serverState.phase) {
      case 'ban1': {
        if (pb < 1) return { purple: { type: 'ban', index: 1 }, orange: null };
        if (ob < 1) return { purple: null, orange: { type: 'ban', index: 1 } };
        if (pb < 2) return { purple: { type: 'ban', index: 2 }, orange: null };
        if (ob < 2) return { purple: null, orange: { type: 'ban', index: 2 } };
        return { purple: null, orange: null };
      }
      case 'pick1': {
        if (pp < 1) return { purple: { type: 'pick', index: 1 }, orange: null };
        if (op < 2) return { purple: null, orange: [{ type: 'pick', index: 1 }, { type: 'pick', index: 2 }] };
        if (pp < 3) return { purple: [{ type: 'pick', index: 2 }, { type: 'pick', index: 3 }], orange: null };
        if (op < 3) return { purple: null, orange: { type: 'pick', index: 3 } };
        return { purple: null, orange: null };
      }
      case 'ban2': {
        if (pb < 3) return { purple: { type: 'ban', index: 3 }, orange: null };
        if (ob < 3) return { purple: null, orange: { type: 'ban', index: 3 } };
        return { purple: null, orange: null };
      }
      case 'pick2': {
        if (op < 4) return { purple: null, orange: { type: 'pick', index: 4 } };
        if (pp < 5) return { purple: [{ type: 'pick', index: 4 }, { type: 'pick', index: 5 }], orange: null };
        if (op < 5) return { purple: null, orange: { type: 'pick', index: 5 } };
        return { purple: null, orange: null };
      }
      default:
        return { purple: null, orange: null };
    }
  }, [serverState]);

  const draftStarted = React.useMemo(() => Boolean(serverState && serverState.phase !== 'lobby' && serverState.phase !== 'starting'), [serverState]);

  const canConfirm = React.useMemo<boolean>(() => {
    if (!draftStarted) return false;
    if (!myTeam) return false;
    const turnTeam = serverState?.turnTeam ?? null;
    return Boolean(turnTeam && turnTeam === myTeam);
  }, [draftStarted, serverState?.turnTeam, myTeam]);

  const state: DraftState<Pokemon> = {
    phase:
      serverState?.phase === 'ban1'
        ? 'ban_phase_1'
        : serverState?.phase === 'pick1'
        ? 'pick_phase_1'
        : serverState?.phase === 'ban2'
        ? 'ban_phase_2'
        : serverState?.phase === 'pick2'
        ? 'pick_phase_2'
        : serverState?.phase === 'finished'
        ? 'completed'
        : 'ban_phase_1',
    draftStarted,
    secondsLeft,
    activeTurn: null,
    bans: bansMapped,
    picks: picksMapped,
  };

  const confirm = React.useCallback(
    async (pokemon?: Pokemon) => {
      if (!roomId || !serverState || !pokemon) return;
      const isBan = serverState.phase === 'ban1' || serverState.phase === 'ban2';
      try {
        await apiApplyAction(roomId, { kind: isBan ? 'ban' : 'pick', ids: [pokemon.id] });
        setPendingSelection(null);
      } catch (e) {
        // 簡易トースト（アラート）でエラー表示
        try {
          const { messageFromFirebaseError } = await import('@/api/errors');
          // eslint-disable-next-line no-alert
          alert(messageFromFirebaseError(e));
        } catch {
          // eslint-disable-next-line no-alert
          alert('操作に失敗しました');
        }
      }
    },
    [roomId, serverState],
  );

  const confirmPair = React.useCallback(
    async (pair: Pokemon[]) => {
      if (!roomId || !serverState) return;
      if (pair.length !== 2) return;
      try {
        await apiApplyAction(roomId, { kind: 'pick', ids: [pair[0].id, pair[1].id] });
        setPendingMulti([]);
      } catch (e) {
        try {
          const { messageFromFirebaseError } = await import('@/api/errors');
          // eslint-disable-next-line no-alert
          alert(messageFromFirebaseError(e));
        } catch {
          // eslint-disable-next-line no-alert
          alert('操作に失敗しました');
        }
      }
    },
    [roomId, serverState],
  );

  const controller: DraftController<Pokemon> = {
    state,
    phaseLabel,
    disabledIds,
    selectionMode,
    canConfirm,
    highlights,
    start: () => {
      // 2Pでは LobbyModal 側から startDraft を呼ぶため、ここでは no-op
      return;
    },
    select: setPendingSelection,
    selectMulti: setPendingMulti,
    confirm,
    confirmPair,
  };

  // 0秒時の自動送信（選択済み優先、未選択はランダム）
  useAutoSubmitOnTimeout({
    roomId,
    serverState,
    secondsLeft,
    canConfirm,
    selectionMode,
    pendingSelection,
    pendingMulti,
    disabledIds,
    allPokemons,
  });

  return controller;
}

// 自動送信: 0秒になったら、選択済みを優先し未選択ならランダムでサーバへ送信
// セキュリティは考慮しない前提（フロント主導の自動確定）
export function useAutoSubmitOnTimeout(params: {
  roomId: string | null;
  serverState: ServerState | null;
  secondsLeft: number;
  canConfirm: boolean;
  selectionMode: SelectionMode;
  pendingSelection: Pokemon | null;
  pendingMulti: Pokemon[];
  disabledIds: string[];
  allPokemons: Pokemon[];
}): void {
  const lastSubmittedTurnRef = React.useRef<number | null>(null);
  const prevSecondsRef = React.useRef<number>(-1);
  React.useEffect(() => {
    const {
      roomId,
      serverState,
      secondsLeft,
      canConfirm,
      selectionMode,
      pendingSelection,
      pendingMulti,
      disabledIds,
      allPokemons,
    } = params;
    const prev = prevSecondsRef.current;
    prevSecondsRef.current = secondsLeft;
    if (!roomId || !serverState) return;
    // 0へのエッジでのみ作動
    if (!(prev > 0 && secondsLeft === 0)) return;
    // 自分のターンのみ
    if (!canConfirm) return;
    const ti = serverState.turnIndex ?? 0;
    if (!ti) return;
    if (lastSubmittedTurnRef.current === ti) return; // 二重送信防止
    // 念のため deadline 実時刻も確認（誤検知防止の最小ガード）
    const dl = serverState.deadline ?? 0;
    if (dl && Date.now() < dl) return;

    const isBan = serverState.phase === 'ban1' || serverState.phase === 'ban2';
    const used = new Set(disabledIds);
    const ids: string[] = [];

    if (selectionMode === 'multi2') {
      const seen = new Set<string>();
      // 選択済みを優先
      for (const p of pendingMulti) {
        if (p && !used.has(p.id) && !seen.has(p.id)) {
          ids.push(p.id);
          seen.add(p.id);
          if (ids.length === 2) break;
        }
      }
      // 不足分をランダム補充
      const candidates = allPokemons.filter((p) => !used.has(p.id) && !seen.has(p.id));
      while (ids.length < 2 && candidates.length > 0) {
        const i = Math.floor(Math.random() * candidates.length);
        const choice = candidates.splice(i, 1)[0];
        ids.push(choice.id);
        seen.add(choice.id);
      }
      if (ids.length !== 2) return; // 候補不足。自動送信はせずサーバ側の処理に委ねる
    } else {
      // single
      if (pendingSelection && !used.has(pendingSelection.id)) {
        ids.push(pendingSelection.id);
      } else {
        const candidates = allPokemons.filter((p) => !used.has(p.id));
        if (candidates.length === 0) return;
        const choice = candidates[Math.floor(Math.random() * candidates.length)];
        ids.push(choice.id);
      }
    }

    // 非同期で送信（自動送信のため UI アラートは出さない）
    (async () => {
      try {
        await apiApplyAction(roomId, { kind: isBan ? 'ban' : 'pick', ids });
        lastSubmittedTurnRef.current = ti;
      } catch (e) {
        console.warn('auto submit failed', e);
      }
    })();
  }, [params.roomId, params.serverState?.turnIndex, params.secondsLeft, params.canConfirm, params.selectionMode, params.pendingSelection, params.pendingMulti, params.disabledIds, params.allPokemons]);
}


export default useDraftControllerRemote;
