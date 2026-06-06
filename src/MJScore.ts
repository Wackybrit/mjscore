import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { HandResult } from "./models/hand-result";
import { Wind } from "./models/wind";
import { createGame, recordHand } from "./services/game-service";
import {
    buildGameStatusReport,
    buildHandSummaryReport
} from "./services/reporting-service";

const rl = readline.createInterface({
    input,
    output
});

async function waitForEnter(message: string): Promise<void> {
    await rl.question(`\n${message}`);
}

async function main(): Promise<void> {
    let game = createGame(
        ["Nick", "Tasha", "Will", "Talia"],
        0
    );

    console.log(buildGameStatusReport(game));

    await waitForEnter("Press Enter to score the completed hand...");

    const handResult: HandResult = {
        handNumber: game.handNumber,
        roundWind: game.roundWind,
        eastPlayerId: game.players[game.eastPlayerIndex]!.id,
        players: [
            { playerId: "1", handScore: 12, mahJongg: false },
            { playerId: "2", handScore: 60, mahJongg: true },
            { playerId: "3", handScore: 20, mahJongg: false },
            { playerId: "4", handScore: 2, mahJongg: false }
        ]
    };

    console.clear();
    console.log(buildHandSummaryReport(game, handResult));

    await waitForEnter("Press Enter to advance to the next hand...");

    game = recordHand(game, handResult);

    console.clear();
    console.log(buildGameStatusReport(game));

    rl.close();
}

main().catch(error => {
    console.error(error);
    rl.close();
});
