"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateSettlements = calculateSettlements;
exports.calculateNetResults = calculateNetResults;
exports.applyNetResultsToPlayers = applyNetResultsToPlayers;
function calculateSettlements(handResult) {
    const winner = getMahJonggPlayer(handResult.players);
    const settlements = [];
    addMahJonggPayments(settlements, handResult.players, winner, handResult.eastPlayerId);
    addHandComparisonPayments(settlements, handResult.players, winner.playerId, handResult.eastPlayerId);
    return settlements;
}
function getMahJonggPlayer(players) {
    const winners = players.filter(player => player.mahJongg);
    if (winners.length !== 1) {
        throw new Error("A hand must have exactly one Mah-Jongg winner.");
    }
    return winners[0];
}
function addMahJonggPayments(settlements, players, winner, eastPlayerId) {
    players
        .filter(player => player.playerId !== winner.playerId)
        .forEach(player => {
        const multiplier = player.playerId === eastPlayerId ||
            winner.playerId === eastPlayerId
            ? 2
            : 1;
        settlements.push({
            fromPlayerId: player.playerId,
            toPlayerId: winner.playerId,
            amount: winner.handScore * multiplier,
            reason: "Mah-Jongg payment"
        });
    });
}
function addHandComparisonPayments(settlements, players, winnerId, eastPlayerId) {
    const nonWinners = players.filter(player => player.playerId !== winnerId);
    for (let i = 0; i < nonWinners.length; i++) {
        for (let j = i + 1; j < nonWinners.length; j++) {
            const playerA = nonWinners[i];
            const playerB = nonWinners[j];
            if (playerA.handScore === playerB.handScore) {
                continue;
            }
            const higher = playerA.handScore > playerB.handScore
                ? playerA
                : playerB;
            const lower = playerA.handScore > playerB.handScore
                ? playerB
                : playerA;
            const baseDifference = higher.handScore - lower.handScore;
            const multiplier = higher.playerId === eastPlayerId ||
                lower.playerId === eastPlayerId
                ? 2
                : 1;
            settlements.push({
                fromPlayerId: lower.playerId,
                toPlayerId: higher.playerId,
                amount: baseDifference * multiplier,
                reason: "Hand comparison"
            });
        }
    }
}
function calculateNetResults(settlements) {
    const netResults = new Map();
    settlements.forEach(settlement => {
        const currentFromAmount = netResults.get(settlement.fromPlayerId) ?? 0;
        const currentToAmount = netResults.get(settlement.toPlayerId) ?? 0;
        netResults.set(settlement.fromPlayerId, currentFromAmount - settlement.amount);
        netResults.set(settlement.toPlayerId, currentToAmount + settlement.amount);
    });
    return Array.from(netResults.entries()).map(([playerId, amount]) => ({
        playerId,
        amount
    }));
}
function applyNetResultsToPlayers(game, netResults) {
    netResults.forEach(result => {
        const player = game.players.find(player => player.id === result.playerId);
        if (!player) {
            throw new Error(`Player not found: ${result.playerId}`);
        }
        player.score += result.amount;
    });
}
//# sourceMappingURL=scoring-service.js.map