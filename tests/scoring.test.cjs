const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calculateSettlements, calculateNetResults, calculateSettlementSummary } = require('../dist/services/scoring-service');
const { createGame, recordHand } = require('../dist/services/game-service');

function hand(scores, winner, east = '1') {
    return {
        handNumber: 1, roundWind: 'East', eastPlayerId: east,
        players: scores.map((handScore, i) => ({ playerId: String(i + 1), handScore, mahJongg: String(i + 1) === winner }))
    };
}
function payments(settlements) {
    return settlements.map(s => [s.fromPlayerId, s.toPlayerId, s.amount, s.reason]).sort();
}
function netAmounts(results) {
    return Object.fromEntries(results.map(r => [r.playerId, r.amount]));
}
const win = 'Mah-Jongg payment';
const compare = 'Hand comparison';
// Expected payments and balances are worked examples, independent of the scoring implementation.
const examples = [
    {
        name: 'East wins: all three winner payments double, loser comparisons stay single',
        scores: [100, 40, 20, 0], winner: '1',
        payments: [['2','1',200,win],['3','1',200,win],['4','1',200,win],['3','2',20,compare],['4','2',40,compare],['4','3',20,compare]],
        net: { '1':600, '2':-140, '3':-200, '4':-260 }
    },
    {
        name: 'East loses with the highest losing score: both East payment directions double',
        scores: [40, 100, 20, 0], winner: '2',
        payments: [['1','2',200,win],['3','2',100,win],['4','2',100,win],['3','1',40,compare],['4','1',80,compare],['4','3',20,compare]],
        net: { '1':-80, '2':400, '3':-120, '4':-200 }
    },
    {
        name: 'East loses with the lowest score; a player with zero net change remains in the summary',
        scores: [0, 100, 40, 20], winner: '2',
        payments: [['1','2',200,win],['3','2',100,win],['4','2',100,win],['1','3',80,compare],['1','4',40,compare],['4','3',20,compare]],
        net: { '1':-320, '2':400, '3':0, '4':-80 }
    },
    {
        name: 'equal losing scores produce no comparison payments',
        scores: [20, 100, 20, 20], winner: '2',
        payments: [['1','2',200,win],['3','2',100,win],['4','2',100,win]],
        net: { '1':-200, '2':400, '3':-100, '4':-100 }
    },
    {
        name: 'a winner with a lower raw score still receives full winner payments and never pays comparisons',
        scores: [100, 22, 80, 60], winner: '2',
        payments: [['1','2',44,win],['3','2',22,win],['4','2',22,win],['3','1',40,compare],['4','1',80,compare],['4','3',20,compare]],
        net: { '1':76, '2':88, '3':-42, '4':-122 }
    }
];
for (const example of examples) {
    test(example.name, () => {
        const result = hand(example.scores, example.winner);
        const before = structuredClone(result);
        for (const players of [result.players, [...result.players].reverse()]) {
            const input = { ...result, players };
            const summary = calculateSettlementSummary(input);
            assert.deepEqual(payments(calculateSettlements(input)), [...example.payments].sort());
            assert.deepEqual(payments(summary.settlements), [...example.payments].sort());
            assert.deepEqual(netAmounts(summary.netResults), example.net);
            assert.deepEqual(netAmounts(calculateNetResults(summary.settlements)), example.net);
            assert.equal(summary.netResults.reduce((total, r) => total + r.amount, 0), 0);
        }
        assert.deepEqual(result, before);
    });
}

test('minimum-score payments work for every winner and East seat combination', () => {
    const ids = ['1','2','3','4'];
    for (const east of ids) for (const winner of ids) {
        const result = hand(ids.map(id => id === winner ? 22 : 0), winner, east);
        const summary = calculateSettlementSummary(result);
        const expected = ids.filter(id => id !== winner).map(id => [id, winner, id === east || winner === east ? 44 : 22, win]);
        assert.deepEqual(payments(summary.settlements), expected.sort(), `East ${east}, winner ${winner}`);
        const balances = netAmounts(summary.netResults);
        assert.equal(balances[winner], winner === east ? 132 : 88);
        for (const loser of ids.filter(id => id !== winner)) assert.equal(balances[loser], winner === east || loser === east ? -44 : -22);
        assert.equal(Object.values(balances).reduce((a,b) => a+b, 0), 0);
    }
});

test('hands with zero or multiple winners are rejected without changing the game', () => {
    const game = createGame(['A','B','C','D'], 0);
    const before = structuredClone(game);
    for (const multiple of [false, true]) {
        const invalid = hand([22,22,0,0], '1');
        invalid.players[0].mahJongg = multiple;
        invalid.players[1].mahJongg = multiple;
        assert.throws(() => calculateSettlements(invalid), /exactly one/);
        assert.throws(() => recordHand(game, invalid), /exactly one/);
        assert.deepEqual(game, before);
    }
});
