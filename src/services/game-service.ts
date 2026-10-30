import { Game } from "../models/game";
import { Player } from "../models/player";
import { Wind, nextWind } from "../models/wind";
import { getNextEastPlayerIndex } from "../models/game-utils";
import { HandResult } from "../models/hand-result";
import {
    calculateSettlements,
    calculateNetResults,
    applyNetResultsToPlayers
} from "./scoring-service";
import { RackColor, RACK_COLOR_ORDER } from "../models/rack-color";

export function createGame(
    playerNames: string[],
    startingEastPlayerIndex: number,
    rackColors: RackColor[] = RACK_COLOR_ORDER
): Game {
    const players: Player[] = playerNames.map((name, index) => ({
        id: (index + 1).toString(),
        name,
        score: 0,
        seatPosition: index,
        rackColor: rackColors[index]!
    }));

    return {
        players,
        eastPlayerIndex: startingEastPlayerIndex,
        startingEastPlayerIndex,
        eastAdvancementsThisRound: 0,
        roundWind: Wind.East,
        roundNumber: 1,
        handNumber: 1,
        hands: []
    };
}

// roundNumber points to the next turn. Advancing past the second North round
// (round 8) ends the game; no extra persisted flag or save-file migration is needed.
export function isGameOver(game: Game): boolean {
    return game.roundNumber > 8;
}

// Repeated dead hands leave this pending until a properly completed hand.
// Deriving it from history also preserves it through saves and hand corrections.
export function isReplayHand(game: Game): boolean {
    return game.hands.at(-1)?.deadHand === true;
}

export function recordDeadHand(game: Game): Game {
    return recordHand(game, {
        handNumber: game.handNumber,
        roundWind: game.roundWind,
        eastPlayerId: game.players[game.eastPlayerIndex]!.id,
        deadHand: true,
        players: game.players.map(player => ({ playerId: player.id, handScore: 0, mahJongg: false }))
    });
}

export function advanceAfterHand(
    game: Game,
    winnerId: string,
    forceEastAdvance: boolean = false
): Game {
    if (isGameOver(game)) throw new Error("The game is over. No further hands can be recorded.");
    const eastPlayer = game.players[game.eastPlayerIndex];

    if (!eastPlayer) {
        throw new Error("Invalid eastPlayerIndex.");
    }

    const eastWon = eastPlayer.id === winnerId;

    let nextEastPlayerIndex = game.eastPlayerIndex;
    let nextRoundWind = game.roundWind;
    let nextRoundNumber = game.roundNumber;
    let nextEastAdvancementsThisRound = game.eastAdvancementsThisRound;

    if (!eastWon || forceEastAdvance) {
        nextEastPlayerIndex = getNextEastPlayerIndex(game.eastPlayerIndex);

        nextEastAdvancementsThisRound =
            game.eastAdvancementsThisRound + 1;

        if (nextEastAdvancementsThisRound >= game.players.length) {
            nextRoundWind = nextWind(game.roundWind);
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

export function recordHand(
    game: Game,
    handResult: HandResult
): Game {
    if (isGameOver(game)) throw new Error("The game is over. No further hands can be recorded.");
    const settlements = calculateSettlements(handResult);
    const netResults = calculateNetResults(settlements);

    const updatedGame: Game = {
        ...game,
        players: game.players.map(player => ({ ...player })),
        hands: [
            ...game.hands,
            handResult
        ]
    };

    applyNetResultsToPlayers(
        updatedGame,
        netResults
    );

    if (handResult.deadHand) {
        return { ...updatedGame, handNumber: game.handNumber + 1 };
    }

    const winner = handResult.players.find(
        player => player.mahJongg
    );

    if (!winner) {
        throw new Error("Cannot record hand: no Mah-Jongg winner found.");
    }

    return advanceAfterHand(
        updatedGame,
        winner.playerId,
        isReplayHand(game)
    );
}

export function rebuildGameFromHands(
    game: Game,
    hands: HandResult[]
): Game {
    let rebuiltGame: Game = {
        ...game,
        players: game.players.map(player => ({
            ...player,
            score: 0
        })),
        eastPlayerIndex: game.startingEastPlayerIndex,
        eastAdvancementsThisRound: 0,
        roundWind: Wind.East,
        roundNumber: 1,
        handNumber: 1,
        hands: []
    };

    hands.forEach(hand => {
        const normalizedHand: HandResult = {
            ...hand,
            handNumber: rebuiltGame.handNumber,
            roundWind: rebuiltGame.roundWind,
            eastPlayerId: rebuiltGame.players[rebuiltGame.eastPlayerIndex]!.id
        };

        rebuiltGame = recordHand(
            rebuiltGame,
            normalizedHand
        );
    });

    return rebuiltGame;
}