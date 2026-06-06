"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildHandSummaryReport = buildHandSummaryReport;
exports.buildGameStatusReport = buildGameStatusReport;
exports.buildHandHistoryReport = buildHandHistoryReport;
exports.getHandHistoryRows = getHandHistoryRows;
const scoring_service_1 = require("./scoring-service");
const game_utils_1 = require("../models/game-utils");
const wind_1 = require("../models/wind");
function buildHandSummaryReport(game, handResult) {
    const summary = (0, scoring_service_1.calculateSettlementSummary)(handResult);
    const winner = (0, scoring_service_1.getMahJonggPlayer)(handResult.players);
    const lines = [];
    lines.push(`Hand ${handResult.handNumber}`);
    lines.push(`Round Wind: ${handResult.roundWind}`);
    lines.push(`East Wind: ${(0, game_utils_1.getPlayerName)(game, handResult.eastPlayerId)}`);
    lines.push(`Mah-Jongg: ${(0, game_utils_1.getPlayerName)(game, winner.playerId)}`);
    lines.push("");
    lines.push("Scores:");
    handResult.players.forEach(playerResult => {
        const playerName = (0, game_utils_1.getPlayerName)(game, playerResult.playerId);
        const scoreText = playerResult.handScore
            .toString()
            .padStart(4);
        const marker = playerResult.mahJongg ? "*" : "";
        lines.push(`${playerName.padEnd(10)} ${scoreText}${marker}`);
    });
    lines.push("");
    lines.push("Payments:");
    summary.settlements.forEach(settlement => {
        lines.push(`${(0, game_utils_1.getPlayerName)(game, settlement.fromPlayerId)} pays ${(0, game_utils_1.getPlayerName)(game, settlement.toPlayerId)}: ${settlement.amount} (${settlement.reason})`);
    });
    lines.push("");
    lines.push("Net Results:");
    summary.netResults.forEach(result => {
        const playerName = (0, game_utils_1.getPlayerName)(game, result.playerId);
        const sign = result.amount > 0 ? "+" : "";
        const amountText = `${sign}${result.amount}`;
        lines.push(`${playerName.padEnd(10)} ${amountText.padStart(6)}`);
    });
    return lines.join("\n");
}
function buildGameStatusReport(game) {
    const lines = [];
    lines.push("Current Game");
    lines.push(`Hand Number: ${game.handNumber}`);
    lines.push("");
    lines.push(`Round Wind: ${game.roundWind}`);
    lines.push(`East Wind: ${game.players[game.eastPlayerIndex]?.name ?? "Unknown"}`);
    lines.push("");
    lines.push("Seat Winds:");
    game.players.forEach(player => {
        const wind = (0, game_utils_1.getPlayerWind)(player.seatPosition, game.eastPlayerIndex);
        lines.push(`${player.name.padEnd(10)} ${wind.padEnd(5)} (${(0, wind_1.getWindNumber)(wind)})`);
    });
    lines.push("");
    lines.push("Current Totals:");
    game.players.forEach(player => {
        const sign = player.score > 0 ? "+" : "";
        const scoreText = `${sign}${player.score}`;
        lines.push(`${player.name.padEnd(10)} ${scoreText.padStart(6)}`);
    });
    return lines.join("\n");
}
function buildHandHistoryReport(game) {
    const lines = [];
    lines.push("Hand History");
    lines.push("");
    lines.push(game.players
        .map(player => player.name.padEnd(10))
        .join(""));
    game.hands.forEach(hand => {
        const row = game.players.map(player => {
            const playerResult = hand.players.find(result => result.playerId === player.id);
            if (!playerResult) {
                return "".padStart(10);
            }
            const scoreText = playerResult.handScore
                .toString()
                .padStart(4) +
                (playerResult.mahJongg ? "*" : "");
            return scoreText.padStart(10);
        });
        lines.push(row.join(""));
    });
    return lines.join("\n");
}
function getHandHistoryRows(game) {
    return game.hands.map(hand => game.players.map(player => {
        const result = hand.players.find(p => p.playerId === player.id);
        if (!result) {
            return "";
        }
        return (result.handScore.toString() +
            (result.mahJongg ? "*" : ""));
    }));
}
//# sourceMappingURL=reporting-service.js.map