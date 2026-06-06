"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = __importDefault(require("node:readline/promises"));
const node_process_1 = require("node:process");
const game_service_1 = require("./services/game-service");
const reporting_service_1 = require("./services/reporting-service");
const rl = promises_1.default.createInterface({
    input: node_process_1.stdin,
    output: node_process_1.stdout
});
async function waitForEnter(message) {
    await rl.question(`\n${message}`);
}
async function main() {
    let game = (0, game_service_1.createGame)(["Nick", "Tasha", "Will", "Talia"], 0);
    console.log((0, reporting_service_1.buildGameStatusReport)(game));
    await waitForEnter("Press Enter to score the completed hand...");
    const handResult = {
        handNumber: game.handNumber,
        roundWind: game.roundWind,
        eastPlayerId: game.players[game.eastPlayerIndex].id,
        players: [
            { playerId: "1", handScore: 12, mahJongg: false },
            { playerId: "2", handScore: 60, mahJongg: true },
            { playerId: "3", handScore: 20, mahJongg: false },
            { playerId: "4", handScore: 2, mahJongg: false }
        ]
    };
    console.clear();
    console.log((0, reporting_service_1.buildHandSummaryReport)(game, handResult));
    await waitForEnter("Press Enter to advance to the next hand...");
    game = (0, game_service_1.recordHand)(game, handResult);
    console.clear();
    console.log((0, reporting_service_1.buildGameStatusReport)(game));
    rl.close();
}
main().catch(error => {
    console.error(error);
    rl.close();
});
//# sourceMappingURL=MJScore.js.map