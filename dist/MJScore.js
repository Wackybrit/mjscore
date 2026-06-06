"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const game_service_1 = require("./services/game-service");
const game_utils_1 = require("./models/game-utils");
const wind_1 = require("./models/wind");
const scoring_service_1 = require("./services/scoring-service");
const game = (0, game_service_1.createGame)(["Nick", "Tasha", "Will", "Talia"], 0);
const handResult = {
    handNumber: 1,
    roundWind: wind_1.Wind.East,
    eastPlayerId: "1",
    players: [
        { playerId: "1", handScore: 12, mahJongg: false },
        { playerId: "2", handScore: 60, mahJongg: true },
        { playerId: "3", handScore: 20, mahJongg: false },
        { playerId: "4", handScore: 2, mahJongg: false }
    ]
};
const settlements = (0, scoring_service_1.calculateSettlements)(handResult);
console.log("Settlements:");
settlements.forEach(settlement => {
    console.log(`${(0, game_utils_1.getPlayerName)(game, settlement.fromPlayerId)} pays ${(0, game_utils_1.getPlayerName)(game, settlement.toPlayerId)}: ${settlement.amount} (${settlement.reason})`);
});
const netResults = (0, scoring_service_1.calculateNetResults)(settlements);
console.log("\nNet Results:");
netResults.forEach(result => {
    console.log(`${(0, game_utils_1.getPlayerName)(game, result.playerId)}: ${result.amount}`);
});
//# sourceMappingURL=MJScore.js.map