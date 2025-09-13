/**
 * 現在の State から、期待されるターン仕様を導出する。
 * フェーズ/配列長から決定し、途中の不整合（配列長が中途半端）も検出する。
 */
export function expectedTurn(state) {
    if (state.phase === 'finished' || state.phase === 'aborted')
        return undefined;
    const bans = state.bans ?? { PURPLE: [], ORANGE: [] };
    const picks = state.picks ?? { PURPLE: [], ORANGE: [] };
    const pb = bans.PURPLE.length;
    const ob = bans.ORANGE.length;
    const pp = picks.PURPLE.length;
    const op = picks.ORANGE.length;
    switch (state.phase) {
        case 'ban1': {
            if (pb < 1)
                return { phase: 'ban1', team: 'PURPLE', kind: 'ban', count: 1 };
            if (ob < 1)
                return { phase: 'ban1', team: 'ORANGE', kind: 'ban', count: 1 };
            if (pb < 2)
                return { phase: 'ban1', team: 'PURPLE', kind: 'ban', count: 1 };
            if (ob < 2)
                return { phase: 'ban1', team: 'ORANGE', kind: 'ban', count: 1 };
            // 次フェーズへ
            return { phase: 'pick1', team: 'PURPLE', kind: 'pick', count: 1 };
        }
        case 'pick1': {
            if (pp < 1)
                return { phase: 'pick1', team: 'PURPLE', kind: 'pick', count: 1 };
            if (op < 2)
                return { phase: 'pick1', team: 'ORANGE', kind: 'pick', count: 2 };
            if (pp < 3)
                return { phase: 'pick1', team: 'PURPLE', kind: 'pick', count: 2 };
            if (op < 3)
                return { phase: 'pick1', team: 'ORANGE', kind: 'pick', count: 1 };
            // 次フェーズへ
            return { phase: 'ban2', team: 'PURPLE', kind: 'ban', count: 1 };
        }
        case 'ban2': {
            if (pb < 3)
                return { phase: 'ban2', team: 'PURPLE', kind: 'ban', count: 1 };
            if (ob < 3)
                return { phase: 'ban2', team: 'ORANGE', kind: 'ban', count: 1 };
            // 次フェーズへ
            return { phase: 'pick2', team: 'ORANGE', kind: 'pick', count: 1 };
        }
        case 'pick2': {
            if (op < 4)
                return { phase: 'pick2', team: 'ORANGE', kind: 'pick', count: 1 };
            if (pp < 5)
                return { phase: 'pick2', team: 'PURPLE', kind: 'pick', count: 2 };
            if (op < 5)
                return { phase: 'pick2', team: 'ORANGE', kind: 'pick', count: 1 };
            return undefined; // 完了
        }
        default:
            return undefined;
    }
}
/**
 * 合法性検証: 入力 IDs が重複や既使用でないかをチェック。
 */
export function validateIds(state, kind, team, ids, expectedCount) {
    if (ids.length !== expectedCount)
        throw new Error('INVALID_IDS_LENGTH');
    const set = new Set();
    for (const id of ids) {
        const norm = String(id || '').trim();
        if (!norm)
            throw new Error('EMPTY_ID');
        if (set.has(norm))
            throw new Error('DUPLICATE_IDS');
        set.add(norm);
    }
    const used = usedIds(state);
    for (const id of set) {
        if (used.has(id))
            throw new Error('ALREADY_USED');
    }
    // ここで将来的に許可リストチェックを追加（functions/src/data/pokemons.json）
}
export function usedIds(state) {
    const s = state;
    const bans = s.bans ?? { PURPLE: [], ORANGE: [] };
    const picks = s.picks ?? { PURPLE: [], ORANGE: [] };
    const set = new Set();
    for (const id of bans.PURPLE)
        set.add(id);
    for (const id of bans.ORANGE)
        set.add(id);
    for (const id of picks.PURPLE)
        set.add(id);
    for (const id of picks.ORANGE)
        set.add(id);
    return set;
}
/**
 * アクション適用し、次ターン（または終了）を返す。
 */
export function applyActionToState(state, team, kind, ids, turnSeconds, now) {
    if (state.phase === 'finished' || state.phase === 'aborted')
        throw new Error('NOT_IN_PROGRESS');
    const exp = expectedTurn(state);
    if (!exp)
        throw new Error('INVALID_PHASE');
    if (exp.team !== team)
        throw new Error('NOT_YOUR_TURN');
    if (exp.kind !== kind)
        throw new Error('WRONG_ACTION_KIND');
    validateIds(state, kind, team, ids, exp.count);
    const bans = state.bans ?? { PURPLE: [], ORANGE: [] };
    const picks = state.picks ?? { PURPLE: [], ORANGE: [] };
    const next = {
        ...state,
        bans: { PURPLE: [...bans.PURPLE], ORANGE: [...bans.ORANGE] },
        picks: { PURPLE: [...picks.PURPLE], ORANGE: [...picks.ORANGE] },
        lastAction: { by: team, kind, ids: [...ids] },
    };
    if (kind === 'ban') {
        next.bans[team].push(ids[0]);
    }
    else {
        for (const id of ids)
            next.picks[team].push(id);
    }
    // 次のターンを導出
    const nxt = expectedTurn({ ...next });
    if (!nxt) {
        next.phase = 'finished';
        next.turnTeam = undefined;
        next.turnIndex = undefined;
        next.deadline = undefined;
        return { nextState: next };
    }
    // フェーズ更新（遷移時）
    next.phase = nxt.phase;
    next.turnTeam = nxt.team;
    next.turnIndex = typeof state.turnIndex === 'number' ? state.turnIndex + 1 : 1;
    const seconds = Math.max(5, Math.min(120, Math.floor(turnSeconds)));
    next.deadline = now + seconds * 1000;
    return { nextState: next, nextTurn: nxt };
}
