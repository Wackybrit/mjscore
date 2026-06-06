import { Game } from "./game";
import { Player } from "./player";
import { Wind, WIND_ORDER } from "./wind";

/**
 * Determine a player's current wind based on:
 * - their seat position
 * - who currently holds East
 */
export function getPlayerWind(
    playerSeatPosition: number,
    eastPlayerIndex: number
): Wind {

    const offset =
        (playerSeatPosition - eastPlayerIndex + 4) % 4;

    return WIND_ORDER[offset]!;
}

/**
 * Rotate East Wind to the next player.
 */
export function getNextEastPlayerIndex(
    currentEastPlayerIndex: number
): number {

    return (currentEastPlayerIndex + 1) % 4;
}

export function getPlayerById(
    game: Game,
    playerId: string
): Player {

    const player = game.players.find(
        player => player.id === playerId
    );

    if (!player) {
        throw new Error(
            `Player not found: ${playerId}`
        );
    }

    return player;
}

export function getPlayerName(
    game: Game,
    playerId: string
): string {

    return getPlayerById(
        game,
        playerId
    ).name;
}