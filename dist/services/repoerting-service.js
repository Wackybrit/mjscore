"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildHandSummaryReport = buildHandSummaryReport;
const game_utils_1 = require("../models/game-utils");
const scoring_service_1 = require("./scoring-service");
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
//# sourceMappingURL=repoerting-service.js.map