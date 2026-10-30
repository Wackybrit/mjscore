import { Game } from "../models/game";
import { Wind } from "../models/wind";
import { RackColor } from "../models/rack-color";
import { rebuildGameFromHands } from "./game-service";

function object(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function integer(value: unknown, minimum: number): value is number {
    return typeof value === "number" && Number.isSafeInteger(value) && value >= minimum;
}
function wind(value: unknown): boolean {
    return Object.values(Wind).includes(value as Wind);
}
function requireValid(condition: unknown): asserts condition {
    if (!condition) throw new Error("Invalid saved-game data.");
}

// Validate before allowing file data into the shared active game. Extra fields are
// tolerated so compatible older saves do not need to be rewritten or migrated.
export function validateSavedGame(value: unknown): asserts value is Game {
    requireValid(object(value));
    requireValid(Array.isArray(value.players) && value.players.length === 4);
    const ids = new Set<string>();
    const colors = new Set<unknown>();
    value.players.forEach((player: unknown, index: number) => {
        requireValid(object(player));
        requireValid(typeof player.id === "string" && /^[a-z0-9_-]+$/i.test(player.id) && !ids.has(player.id));
        ids.add(player.id);
        requireValid(typeof player.name === "string" && player.name.trim().length > 0);
        requireValid(typeof player.score === "number" && Number.isSafeInteger(player.score) && player.score % 2 === 0);
        requireValid(player.seatPosition === index);
        requireValid(Object.values(RackColor).includes(player.rackColor as RackColor));
        colors.add(player.rackColor);
    });
    requireValid(colors.size === 4);
    requireValid(integer(value.eastPlayerIndex, 0) && value.eastPlayerIndex < 4);
    requireValid(integer(value.startingEastPlayerIndex, 0) && value.startingEastPlayerIndex < 4);
    requireValid(integer(value.eastAdvancementsThisRound, 0) && value.eastAdvancementsThisRound < 4);
    requireValid(wind(value.roundWind) && integer(value.roundNumber, 1));
    requireValid(Array.isArray(value.hands) && value.handNumber === value.hands.length + 1);
    value.hands.forEach((hand: unknown, index: number) => {
        requireValid(object(hand));
        requireValid(hand.handNumber === index + 1 && wind(hand.roundWind));
        requireValid(typeof hand.eastPlayerId === "string" && ids.has(hand.eastPlayerId));
        requireValid(hand.notes === undefined || typeof hand.notes === "string");
        requireValid(Array.isArray(hand.players) && hand.players.length === 4);
        const handIds = new Set<string>();
        let winners = 0;
        hand.players.forEach((result: unknown) => {
            requireValid(object(result));
            requireValid(typeof result.playerId === "string" && ids.has(result.playerId) && !handIds.has(result.playerId));
            handIds.add(result.playerId);
            requireValid(integer(result.handScore, 0) && result.handScore % 2 === 0);
            requireValid(typeof result.mahJongg === "boolean");
            if (result.mahJongg) winners++;
        });
        requireValid(winners === 1);
    });

    const game = value as unknown as Game;
    const rebuilt = rebuildGameFromHands(game, game.hands);
    requireValid(game.players.every((player, index) =>
        Number.isSafeInteger(rebuilt.players[index]!.score) && player.score === rebuilt.players[index]!.score));
    requireValid(game.hands.every((hand, index) =>
        hand.eastPlayerId === rebuilt.hands[index]!.eastPlayerId && hand.roundWind === rebuilt.hands[index]!.roundWind));
    requireValid(game.eastPlayerIndex === rebuilt.eastPlayerIndex &&
        game.eastAdvancementsThisRound === rebuilt.eastAdvancementsThisRound &&
        game.roundWind === rebuilt.roundWind && game.roundNumber === rebuilt.roundNumber);
}
