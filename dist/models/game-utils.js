"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlayerWind = getPlayerWind;
exports.getNextEastPlayerIndex = getNextEastPlayerIndex;
exports.getPlayerById = getPlayerById;
exports.getPlayerName = getPlayerName;
const wind_1 = require("./wind");
/**
 * Determine a player's current wind based on:
 * - their seat position
 * - who currently holds East
 */
function getPlayerWind(playerSeatPosition, eastPlayerIndex) {
    const offset = (playerSeatPosition - eastPlayerIndex + 4) % 4;
    return wind_1.WIND_ORDER[offset];
}
/**
 * Rotate East Wind to the next player.
 */
function getNextEastPlayerIndex(currentEastPlayerIndex) {
    return (currentEastPlayerIndex + 1) % 4;
}
function getPlayerById(game, playerId) {
    const player = game.players.find(player => player.id === playerId);
    if (!player) {
        throw new Error(`Player not found: ${playerId}`);
    }
    return player;
}
function getPlayerName(game, playerId) {
    return getPlayerById(game, playerId).name;
}
//# sourceMappingURL=game-utils.js.map