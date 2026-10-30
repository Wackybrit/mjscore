const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createGame, recordHand, rebuildGameFromHands } = require('../dist/services/game-service');
const { getPlayerWind } = require('../dist/models/game-utils');

function result(game, winner, scores = game.players.map(p => p.id === winner ? 22 : 0)) {
    return {
        handNumber: game.handNumber, roundWind: game.roundWind,
        eastPlayerId: game.players[game.eastPlayerIndex].id,
        players: game.players.map((p,i) => ({ playerId:p.id, handScore:scores[i], mahJongg:p.id === winner }))
    };
}
function state(game) {
    return [game.eastPlayerIndex, game.roundWind, game.roundNumber, game.eastAdvancementsThisRound];
}
function freeze(value) {
    Object.freeze(value);
    for (const item of Object.values(value)) if (item && typeof item === 'object') freeze(item);
    return value;
}

test('seat winds are correct at every East position', () => {
    const expected = [
        ['East','South','West','North'],
        ['North','East','South','West'],
        ['West','North','East','South'],
        ['South','West','North','East']
    ];
    for (let east = 0; east < 4; east++) {
        assert.deepEqual([0,1,2,3].map(seat => getPlayerWind(seat,east)), expected[east]);
    }
});

test('all four rounds advance after four East losses, with East repeats delaying each boundary', () => {
    let game = createGame(['A','B','C','D'], 0);
    const expected = [
        [1,'East',1,1], [2,'East',1,2], [3,'East',1,3], [0,'South',2,0],
        [1,'South',2,1], [2,'South',2,2], [3,'South',2,3], [0,'West',3,0],
        [1,'West',3,1], [2,'West',3,2], [3,'West',3,3], [0,'North',4,0],
        [1,'North',4,1], [2,'North',4,2], [3,'North',4,3], [0,'East',5,0]
    ];
    let completed = 0;
    for (const next of expected) {
        // Two consecutive East wins must not count toward a round transition.
        const held = state(game);
        for (let repeat = 0; repeat < 2; repeat++) {
            const before = structuredClone(game);
            const hand = result(game, game.players[game.eastPlayerIndex].id);
            game = recordHand(game, hand);
            completed++;
            assert.deepEqual(state(game), held);
            assert.equal(game.handNumber, completed + 1);
            assert.equal(game.hands.length, completed);
            assert.equal(game.hands.at(-1).eastPlayerId, hand.eastPlayerId);
            assert.equal(game.hands.at(-1).roundWind, before.roundWind);
        }
        const winner = game.players[(game.eastPlayerIndex + 1) % 4].id;
        game = recordHand(game, result(game, winner));
        completed++;
        assert.deepEqual(state(game), next);
        assert.equal(game.handNumber, completed + 1);
        assert.equal(game.hands.length, completed);
        assert.equal(game.players.reduce((sum,p) => sum + p.score,0),0);
    }
    assert.equal(game.hands.length,48);
});

test('each starting East completes a round relative to that starting position', () => {
    const seatsAfterLoss = [[1,2,3,0],[2,3,0,1],[3,0,1,2],[0,1,2,3]];
    for (let starting = 0; starting < 4; starting++) {
        let game = createGame(['A','B','C','D'],starting);
        assert.deepEqual(state(game),[starting,'East',1,0]);
        for (let step = 0; step < 4; step++) {
            const winner = game.players[seatsAfterLoss[starting][step]].id;
            game = recordHand(game,result(game,winner));
            assert.deepEqual(state(game),[seatsAfterLoss[starting][step],step === 3 ? 'South':'East',step === 3 ? 2:1,step === 3 ? 0:step+1]);
            assert.equal(game.startingEastPlayerIndex,starting);
        }
    }
});

test('recording hands accumulates worked balances and preserves earlier game snapshots', () => {
    const initial = freeze(createGame(['A','B','C','D'],0));
    const firstResult = freeze(result(initial,'2',[40,100,20,0]));
    const first = freeze(recordHand(initial,firstResult));
    assert.deepEqual(first.players.map(p => p.score),[-80,400,-120,-200]);
    const second = recordHand(first,result(first,'2'));
    assert.deepEqual(second.players.map(p => p.score),[-124,532,-164,-244]);
    assert.deepEqual(state(second),[1,'East',1,1]);
    assert.equal(second.handNumber,3);
    assert.deepEqual(initial.players.map(p => p.score),[0,0,0,0]);
    assert.equal(initial.hands.length,0);
    assert.deepEqual(first.players.map(p => p.score),[-80,400,-120,-200]);
    assert.equal(first.hands.length,1);
});

test('correcting the latest winner recalculates payments and advances East correctly', () => {
    const initial = createGame(['A','B','C','D'],0);
    const first = recordHand(initial,result(initial,'2',[40,100,20,0]));
    const original = recordHand(first,result(first,'2'));
    const before = structuredClone(original);
    const corrected = { ...result(first,'1'), notes:'Corrected winner' };
    const rebuilt = rebuildGameFromHands(original,[original.hands[0],corrected]);
    assert.deepEqual(rebuilt.players.map(p => p.score),[8,356,-142,-222]);
    assert.deepEqual(state(rebuilt),[2,'East',1,2]);
    assert.equal(rebuilt.handNumber,3);
    assert.equal(rebuilt.hands[1].notes,'Corrected winner');
    assert.deepEqual(original,before);
    assert.deepEqual(rebuildGameFromHands(rebuilt,rebuilt.hands),rebuilt);
});

test('correcting a round-ending hand to an East win restores the previous round', () => {
    let game = createGame(['A','B','C','D'],0);
    for (const winner of ['2','3','4']) game = recordHand(game,result(game,winner));
    const beforeLast = game;
    assert.deepEqual(beforeLast.players.map(p => p.score),[-88,22,22,44]);
    const original = recordHand(game,result(game,'1'));
    assert.deepEqual(state(original),[0,'South',2,0]);
    const corrected = result(beforeLast,'4');
    const rebuilt = rebuildGameFromHands(original,[...original.hands.slice(0,-1),corrected]);
    assert.deepEqual(state(rebuilt),[3,'East',1,3]);
    assert.equal(rebuilt.handNumber,5);
    assert.equal(rebuilt.hands[3].roundWind,'East');
    assert.equal(rebuilt.hands[3].eastPlayerId,'4');
    // First three hands: [-88,22,22,44]; East's corrected win adds [-44,-44,-44,132].
    assert.deepEqual(rebuilt.players.map(p => p.score),[-132,-22,-22,176]);
    assert.deepEqual(state(original),[0,'South',2,0]);
});

test('rebuilding from a non-first starting East preserves history, and empty history resets totals', () => {
    let game = createGame(['A','B','C','D'],2);
    for (const winner of ['3','4','1','2','3']) game = recordHand(game,result(game,winner));
    assert.deepEqual(rebuildGameFromHands(game,game.hands),game);
    const cleared = rebuildGameFromHands(game,[]);
    assert.deepEqual(state(cleared),[2,'East',1,0]);
    assert.equal(cleared.handNumber,1);
    assert.deepEqual(cleared.hands,[]);
    assert.deepEqual(cleared.players.map(p => p.score),[0,0,0,0]);
    assert.deepEqual(cleared.players.map(p => [p.id,p.name,p.rackColor,p.seatPosition]),game.players.map(p => [p.id,p.name,p.rackColor,p.seatPosition]));
});

test('correcting only the score changes balances without changing East or round progression', () => {
    const initial = createGame(['A','B','C','D'],0);
    const first = recordHand(initial,result(initial,'2',[40,100,20,0]));
    const original = recordHand(first,result(first,'2'));
    const corrected = result(first,'2',[0,24,0,0]);
    const rebuilt = rebuildGameFromHands(original,[original.hands[0],corrected]);
    assert.deepEqual(rebuilt.players.map(p => p.score),[-128,544,-168,-248]);
    assert.deepEqual(state(rebuilt),[1,'East',1,1]);
    assert.equal(rebuilt.handNumber,3);
    assert.deepEqual(original.players.map(p => p.score),[-124,532,-164,-244]);
});
