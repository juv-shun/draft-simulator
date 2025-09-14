import React from 'react';
import type { Pokemon } from '@/types';
import type {
  DraftController,
  DraftState,
  PhaseKey,
  Turn,
  SelectionMode,
} from './types';

const initialState = (): DraftState<Pokemon> => ({
  phase: 'ban_phase_1',
  draftStarted: false,
  secondsLeft: 15,
  activeTurn: null,
  bans: { purple: [null, null, null], orange: [null, null, null] },
  picks: { purple: [null, null, null, null, null], orange: [null, null, null, null, null] },
});

export function useDraftControllerLocal(allPokemons: Pokemon[]): DraftController<Pokemon> {
  const [state, setState] = React.useState<DraftState<Pokemon>>(initialState);
  const [pendingSelection, setPendingSelection] = React.useState<Pokemon | null>(null);
  const [pendingMulti, setPendingMulti] = React.useState<Pokemon[]>([]);
  const timerRef = React.useRef<number | null>(null);

  const phaseLabel = React.useMemo<string>(() => {
    switch (state.phase) {
      case 'ban_phase_1':
        return '使用禁止フェーズ1';
      case 'pick_phase_1':
        return '使用ポケモン選択フェーズ1';
      case 'ban_phase_2':
        return '使用禁止フェーズ2';
      case 'pick_phase_2':
        return '使用ポケモン選択フェーズ2';
      case 'completed':
        return 'ドラフト完了';
      default:
        return '—';
    }
  }, [state.phase]);

  // timer helpers
  const stopTimer = React.useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startCountdown = React.useCallback(() => {
    // reset 15s
    setState((s) => ({ ...s, secondsLeft: 15 }));
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
    }
    timerRef.current = window.setInterval(() => {
      setState((prev) => {
        if (prev.secondsLeft <= 1) {
          if (timerRef.current) window.clearInterval(timerRef.current);
          timerRef.current = null;
          return { ...prev, secondsLeft: 0 };
        }
        return { ...prev, secondsLeft: prev.secondsLeft - 1 };
      });
    }, 1000);
  }, []);

  const gotoTurn = React.useCallback(
    (turn: Turn) => {
      setState((s) => ({ ...s, activeTurn: turn }));
      setPendingSelection(null);
      setPendingMulti([]);
      startCountdown();
    },
    [startCountdown],
  );

  React.useEffect(() => () => stopTimer(), [stopTimer]);

  // derived disabled IDs
  const disabledIds = React.useMemo<string[]>(() => {
    const ids = new Set<string>();
    [...state.bans.purple, ...state.bans.orange, ...state.picks.purple, ...state.picks.orange].forEach(
      (p) => {
        if (p) ids.add(p.id);
      },
    );
    return Array.from(ids);
  }, [state.bans, state.picks]);

  // selection mode and canConfirm
  const selectionMode: SelectionMode = React.useMemo(() => {
    const t = state.activeTurn;
    if (!t) return 'single';
    if (t.action !== 'pick') return 'single';
    if ((t.team === 'orange' && t.index === 1) || (t.team === 'purple' && t.index === 2) || (t.team === 'purple' && t.index === 4))
      return 'multi2';
    return 'single';
  }, [state.activeTurn]);

  const canConfirm = React.useMemo<boolean>(() => state.draftStarted, [state.draftStarted]);

  const highlights = React.useMemo<
    DraftController<Pokemon>['highlights']
  >(() => {
    const t = state.activeTurn;
    if (!t) return { purple: null, orange: null };
    if (t.action === 'pick') {
      if (t.team === 'purple') {
        if (t.index === 2) return { purple: [{ type: 'pick', index: 2 }, { type: 'pick', index: 3 }], orange: null };
        if (t.index === 4) return { purple: [{ type: 'pick', index: 4 }, { type: 'pick', index: 5 }], orange: null };
        return { purple: { type: 'pick', index: t.index }, orange: null };
      } else {
        if (t.index === 1) return { purple: null, orange: [{ type: 'pick', index: 1 }, { type: 'pick', index: 2 }] };
        return { purple: null, orange: { type: 'pick', index: t.index } };
      }
    }
    // ban
    return {
      purple: t.team === 'purple' ? { type: 'ban', index: t.index } : null,
      orange: t.team === 'orange' ? { type: 'ban', index: t.index } : null,
    };
  }, [state.activeTurn]);

  // timeout: ban steps
  React.useEffect(() => {
    if (!state.draftStarted) return;
    if (state.secondsLeft !== 0) return;
    const turn = state.activeTurn;
    if (!turn || turn.action !== 'ban') return;
    if (![1, 2, 3].includes(turn.index)) return;

    const used = new Set(disabledIds);
    const candidates = allPokemons.filter((p) => !used.has(p.id));
    if (candidates.length === 0) return;
    const preferred = pendingSelection && !used.has(pendingSelection.id) ? pendingSelection : null;
    const choice = preferred ?? candidates[Math.floor(Math.random() * candidates.length)];

    if (turn.team === 'purple') {
      setState((s) => ({
        ...s,
        bans: {
          ...s.bans,
          purple: s.bans.purple.map((x, idx) => (idx === turn.index - 1 ? choice : x)),
        },
      }));
      setPendingSelection(null);
      if (turn.index === 1) gotoTurn({ team: 'orange', action: 'ban', index: 1 });
      else if (turn.index === 2) gotoTurn({ team: 'orange', action: 'ban', index: 2 });
      else if (turn.index === 3) gotoTurn({ team: 'orange', action: 'ban', index: 3 });
    } else {
      setState((s) => ({
        ...s,
        bans: {
          ...s.bans,
          orange: s.bans.orange.map((x, idx) => (idx === turn.index - 1 ? choice : x)),
        },
      }));
      setPendingSelection(null);
      if (turn.index === 1) gotoTurn({ team: 'purple', action: 'ban', index: 2 });
      else if (turn.index === 2) {
        setState((s) => ({ ...s, phase: 'pick_phase_1' }));
        gotoTurn({ team: 'purple', action: 'pick', index: 1 });
      } else if (turn.index === 3) {
        setState((s) => ({ ...s, phase: 'pick_phase_2' }));
        gotoTurn({ team: 'orange', action: 'pick', index: 4 });
      }
    }
  }, [state.secondsLeft, state.activeTurn, state.draftStarted, disabledIds, allPokemons, pendingSelection, gotoTurn]);

  // timeout: pick steps
  React.useEffect(() => {
    if (!state.draftStarted) return;
    if (state.secondsLeft !== 0) return;
    const turn = state.activeTurn;
    if (!turn || turn.action !== 'pick') return;

    const used = new Set(disabledIds);

    const pickRandom = (n: number, prefer?: Pokemon[]): Pokemon[] => {
      const result: Pokemon[] = [];
      if (prefer && prefer.length) {
        prefer.forEach((pp) => {
          if (!used.has(pp.id) && !result.find((r) => r.id === pp.id) && result.length < n) {
            result.push(pp);
            used.add(pp.id);
          }
        });
      }
      const candidates = allPokemons.filter((p) => !used.has(p.id));
      while (result.length < n && candidates.length > 0) {
        const idx = Math.floor(Math.random() * candidates.length);
        const choice = candidates.splice(idx, 1)[0];
        result.push(choice);
        used.add(choice.id);
      }
      return result;
    };

    if (turn.team === 'purple' && turn.index === 1) {
      if (state.picks.purple[0]) return;
      const [choice] = pickRandom(1, pendingSelection ? [pendingSelection] : []);
      setState((s) => ({
        ...s,
        picks: { ...s.picks, purple: s.picks.purple.map((x, i) => (i === 0 ? choice : x)) },
      }));
      setPendingSelection(null);
      gotoTurn({ team: 'orange', action: 'pick', index: 1 });
      return;
    }

    if (turn.team === 'orange' && turn.index === 1) {
      if (state.picks.orange[0] && state.picks.orange[1]) return;
      const result = pickRandom(2, pendingMulti);
      if (result.length < 2) return;
      setState((s) => ({
        ...s,
        picks: {
          ...s.picks,
          orange: s.picks.orange.map((x, i) => (i === 0 ? result[0] : i === 1 ? result[1] : x)),
        },
      }));
      setPendingSelection(null);
      setPendingMulti([]);
      gotoTurn({ team: 'purple', action: 'pick', index: 2 });
      return;
    }

    if (turn.team === 'purple' && turn.index === 2) {
      if (state.picks.purple[1] && state.picks.purple[2]) return;
      const result = pickRandom(2, pendingMulti);
      if (result.length < 2) return;
      setState((s) => ({
        ...s,
        picks: {
          ...s.picks,
          purple: s.picks.purple.map((x, i) => (i === 1 ? result[0] : i === 2 ? result[1] : x)),
        },
      }));
      setPendingSelection(null);
      setPendingMulti([]);
      gotoTurn({ team: 'orange', action: 'pick', index: 3 });
      return;
    }

    if (turn.team === 'orange' && turn.index === 3) {
      if (state.picks.orange[2]) return;
      const [choice] = pickRandom(1, pendingSelection ? [pendingSelection] : []);
      setState((s) => ({
        ...s,
        picks: { ...s.picks, orange: s.picks.orange.map((x, i) => (i === 2 ? choice : x)) },
      }));
      setPendingSelection(null);
      setState((s) => ({ ...s, phase: 'ban_phase_2' }));
      gotoTurn({ team: 'purple', action: 'ban', index: 3 });
      return;
    }

    if (turn.team === 'orange' && turn.index === 4) {
      if (state.picks.orange[3]) return;
      const [choice] = pickRandom(1, pendingSelection ? [pendingSelection] : []);
      setState((s) => ({
        ...s,
        picks: { ...s.picks, orange: s.picks.orange.map((x, i) => (i === 3 ? choice : x)) },
      }));
      setPendingSelection(null);
      gotoTurn({ team: 'purple', action: 'pick', index: 4 });
      return;
    }

    if (turn.team === 'purple' && turn.index === 4) {
      if (state.picks.purple[3] && state.picks.purple[4]) return;
      const result = pickRandom(2, pendingMulti);
      if (result.length < 2) return;
      setState((s) => ({
        ...s,
        picks: {
          ...s.picks,
          purple: s.picks.purple.map((x, i) => (i === 3 ? result[0] : i === 4 ? result[1] : x)),
        },
      }));
      setPendingSelection(null);
      setPendingMulti([]);
      gotoTurn({ team: 'orange', action: 'pick', index: 5 });
      return;
    }

    if (turn.team === 'orange' && turn.index === 5) {
      if (state.picks.orange[4]) return;
      const [choice] = pickRandom(1, pendingSelection ? [pendingSelection] : []);
      setState((s) => ({
        ...s,
        picks: { ...s.picks, orange: s.picks.orange.map((x, i) => (i === 4 ? choice : x)) },
        phase: 'completed',
        activeTurn: null,
      }));
      setPendingSelection(null);
      stopTimer();
    }
  }, [state.secondsLeft, state.activeTurn, state.draftStarted, state.picks, disabledIds, allPokemons, pendingSelection, pendingMulti, gotoTurn, stopTimer]);

  

  const confirm = React.useCallback(
    (pokemon?: Pokemon) => {
      const turn = state.activeTurn;
      if (!turn) return;
      // BAN confirm
      if (turn.action === 'ban' && pokemon) {
        if (disabledIds.includes(pokemon.id)) return;
        if (turn.team === 'purple') {
          setState((s) => ({
            ...s,
            bans: { ...s.bans, purple: s.bans.purple.map((x, i) => (i === turn.index - 1 ? pokemon : x)) },
          }));
          setPendingSelection(null);
          if (turn.index === 1) gotoTurn({ team: 'orange', action: 'ban', index: 1 });
          else if (turn.index === 2) gotoTurn({ team: 'orange', action: 'ban', index: 2 });
          else if (turn.index === 3) gotoTurn({ team: 'orange', action: 'ban', index: 3 });
        } else {
          setState((s) => ({
            ...s,
            bans: { ...s.bans, orange: s.bans.orange.map((x, i) => (i === turn.index - 1 ? pokemon : x)) },
          }));
          setPendingSelection(null);
          if (turn.index === 1) gotoTurn({ team: 'purple', action: 'ban', index: 2 });
          else if (turn.index === 2) {
            setState((s) => ({ ...s, phase: 'pick_phase_1' }));
            gotoTurn({ team: 'purple', action: 'pick', index: 1 });
          } else if (turn.index === 3) {
            setState((s) => ({ ...s, phase: 'pick_phase_2' }));
            gotoTurn({ team: 'orange', action: 'pick', index: 4 });
          }
        }
        return;
      }

      // PICK single confirm
      if (turn.action === 'pick' && pokemon) {
        if (disabledIds.includes(pokemon.id)) return;
        if (turn.team === 'purple' && turn.index === 1) {
          setState((s) => ({
            ...s,
            picks: { ...s.picks, purple: s.picks.purple.map((x, i) => (i === 0 ? pokemon : x)) },
          }));
          setPendingSelection(null);
          gotoTurn({ team: 'orange', action: 'pick', index: 1 });
        } else if (turn.team === 'orange' && turn.index === 3) {
          setState((s) => ({
            ...s,
            picks: { ...s.picks, orange: s.picks.orange.map((x, i) => (i === 2 ? pokemon : x)) },
          }));
          setPendingSelection(null);
          setState((s) => ({ ...s, phase: 'ban_phase_2' }));
          gotoTurn({ team: 'purple', action: 'ban', index: 3 });
        } else if (turn.team === 'orange' && turn.index === 4) {
          setState((s) => ({
            ...s,
            picks: { ...s.picks, orange: s.picks.orange.map((x, i) => (i === 3 ? pokemon : x)) },
          }));
          setPendingSelection(null);
          gotoTurn({ team: 'purple', action: 'pick', index: 4 });
        } else if (turn.team === 'orange' && turn.index === 5) {
          setState((s) => ({
            ...s,
            picks: { ...s.picks, orange: s.picks.orange.map((x, i) => (i === 4 ? pokemon : x)) },
            phase: 'completed',
            activeTurn: null,
          }));
          setPendingSelection(null);
          stopTimer();
        }
      }
    },
    [state.activeTurn, disabledIds, gotoTurn, stopTimer],
  );

  const confirmPair = React.useCallback(
    (pair: Pokemon[]) => {
      const turn = state.activeTurn;
      if (!turn || turn.action !== 'pick' || pair.length !== 2) return;
      const ids = new Set(disabledIds);
      if (pair.some((p) => ids.has(p.id))) return;
      if (turn.team === 'orange' && turn.index === 1) {
        setState((s) => ({
          ...s,
          picks: {
            ...s.picks,
            orange: s.picks.orange.map((x, i) => (i === 0 ? pair[0] : i === 1 ? pair[1] : x)),
          },
        }));
        setPendingSelection(null);
        setPendingMulti([]);
        gotoTurn({ team: 'purple', action: 'pick', index: 2 });
      } else if (turn.team === 'purple' && turn.index === 2) {
        setState((s) => ({
          ...s,
          picks: {
            ...s.picks,
            purple: s.picks.purple.map((x, i) => (i === 1 ? pair[0] : i === 2 ? pair[1] : x)),
          },
        }));
        setPendingSelection(null);
        setPendingMulti([]);
        gotoTurn({ team: 'orange', action: 'pick', index: 3 });
      } else if (turn.team === 'purple' && turn.index === 4) {
        setState((s) => ({
          ...s,
          picks: {
            ...s.picks,
            purple: s.picks.purple.map((x, i) => (i === 3 ? pair[0] : i === 4 ? pair[1] : x)),
          },
        }));
        setPendingSelection(null);
        setPendingMulti([]);
        gotoTurn({ team: 'orange', action: 'pick', index: 5 });
      }
    },
    [state.activeTurn, disabledIds, gotoTurn],
  );

  const start = React.useCallback(() => {
    setState((s) => (s.draftStarted ? s : { ...initialState(), draftStarted: true }));
    gotoTurn({ team: 'purple', action: 'ban', index: 1 });
  }, [gotoTurn]);

  const controller: DraftController<Pokemon> = {
    state,
    phaseLabel,
    disabledIds,
    selectionMode,
    canConfirm,
    isSpectator: false,
    highlights,
    start,
    select: setPendingSelection,
    selectMulti: setPendingMulti,
    confirm: confirm,
    confirmPair,
  };

  return controller;
}

export default useDraftControllerLocal;
