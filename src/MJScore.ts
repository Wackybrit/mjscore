import { createGame } from "./services/game-service";
import { getPlayerName } from "./models/game-utils";
import { HandResult } from "./models/hand-result";
import { Wind } from "./models/wind";
import { calculateNetResults, calculateSettlements } from "./services/scoring-service";

const game = createGame(
    ["Nick", "Tasha", "Will", "Talia"],
    0
);

const handResult: HandResult = {
    handNumber: 1,
    roundWind: Wind.East,
    eastPlayerId: "1",
    players: [
        { playerId: "1", handScore: 12, mahJongg: false },
        { playerId: "2", handScore: 60, mahJongg: true },
        { playerId: "3", handScore: 20, mahJongg: false },
        { playerId: "4", handScore: 2, mahJongg: false }
    ]
};

const settlements = calculateSettlements(handResult);

console.log("Settlements:");

settlements.forEach(settlement => {
    console.log(
        `${getPlayerName(game, settlement.fromPlayerId)} pays ${getPlayerName(
            game,
            settlement.toPlayerId
        )}: ${settlement.amount} (${settlement.reason})`
    );
});

const netResults = calculateNetResults(settlements);

console.log("\nNet Results:");

netResults.forEach(result => {
    console.log(
        `${getPlayerName(game, result.playerId)}: ${result.amount}`
    );
});
