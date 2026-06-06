"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGame = createGame;
exports.advanceAfterHand = advanceAfterHand;
exports.recordHand = recordHand;
const wind_1 = require("../models/wind");
const game_utils_1 = require("../models/game-utils");
const scoring_service_1 = require("./scoring-service");
function createGame(playerNames, startingEastPlayerIndex) {
    const players = playerNames.map((name, index) => ({
        id: (index + 1).toString(),
        name,
        score: 0,
        seatPosition: index
    }));
    return {
        players,
        eastPlayerIndex: startingEastPlayerIndex,
        startingEastPlayerIndex,
        eastAdvancementsThisRound: 0,
        roundWind: wind_1.Wind.East,
        roundNumber: 1,
        handNumber: 1,
        hands: []
    };
}
function advanceAfterHand(game, winnerId) {
    const eastPlayer = game.players[game.eastPlayerIndex];
    if (!eastPlayer) {
        throw new Error("Invalid eastPlayerIndex.");
    }
    const eastWon = eastPlayer.id === winnerId;
    let nextEastPlayerIndex = game.eastPlayerIndex;
    let nextRoundWind = game.roundWind;
    let nextRoundNumber = game.roundNumber;
    let nextEastAdvancementsThisRound = game.eastAdvancementsThisRound;
    if (!eastWon) {
        nextEastPlayerIndex = (0, game_utils_1.getNextEastPlayerIndex)(game.eastPlayerIndex);
        nextEastAdvancementsThisRound =
            game.eastAdvancementsThisRound + 1;
        if (nextEastAdvancementsThisRound >= game.players.length) {
            nextRoundWind = (0, wind_1.nextWind)(game.roundWind);
            nextRoundNumber += 1;
            nextEastAdvancementsThisRound = 0;
        }
    }
    return {
        ...game,
        eastPlayerIndex: nextEastPlayerIndex,
        eastAdvancementsThisRound: nextEastAdvancementsThisRound,
        roundWind: nextRoundWind,
        roundNumber: nextRoundNumber,
        handNumber: game.handNumber + 1
    };
}
function recordHand(game, handResult) {
    const settlements = (0, scoring_service_1.calculateSettlements)(handResult);
    const netResults = (0, scoring_service_1.calculateNetResults)(settlements);
    const updatedGame = {
        ...game,
        players: game.players.map(player => ({ ...player })),
        hands: [
            ...game.hands,
            handResult
        ]
    };
    (0, scoring_service_1.applyNetResultsToPlayers)(updatedGame, netResults);
    const winner = handResult.players.find(player => player.mahJongg);
    if (!winner) {
        throw new Error("Cannot record hand: no Mah-Jongg winner found.");
    }
    return advanceAfterHand(updatedGame, winner.playerId);
}
//# sourceMappingURL=game-service.js.map