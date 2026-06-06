import { Wind } from "./wind";
/**
 * Determine a player's current wind based on:
 * - their seat position
 * - who currently holds East
 */
export declare function getPlayerWind(playerSeatPosition: number, eastPlayerIndex: number): Wind;
/**
 * Rotate East Wind to the next player.
 */
export declare function getNextEastPlayerIndex(currentEastPlayerIndex: number): number;
//# sourceMappingURL=game-utils.d.ts.map