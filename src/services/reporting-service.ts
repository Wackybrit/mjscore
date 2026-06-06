import { Game } from "../models/game";
import { HandResult } from "../models/hand-result";
import { calculateSettlementSummary, getMahJonggPlayer} from "./scoring-service";
import { getPlayerName, getPlayerWind } from "../models/game-utils";
import { getWindNumber } from "../models/wind";

export function buildHandSummaryReport(
    game: Game,
    handResult: HandResult
): string {
    const summary = calculateSettlementSummary(handResult);
    const winner = getMahJonggPlayer(handResult.players);

    const lines: string[] = [];

    lines.push(`Hand ${handResult.handNumber}`);
    lines.push(`Round Wind: ${handResult.roundWind}`);
    lines.push(`East Wind: ${getPlayerName(game, handResult.eastPlayerId)}`);
    lines.push(`Mah-Jongg: ${getPlayerName(game, winner.playerId)}`);
    lines.push("");

    lines.push("Scores:");

    handResult.players.forEach(playerResult => {
        const playerName = getPlayerName(game, playerResult.playerId);
        const scoreText = playerResult.handScore
            .toString()
            .padStart(4);

        const marker = playerResult.mahJongg ? "*" : "";

        lines.push(
            `${playerName.padEnd(10)} ${scoreText}${marker}`
        );
    });

    lines.push("");

    lines.push("Payments:");

    summary.settlements.forEach(settlement => {
        lines.push(
            `${getPlayerName(game, settlement.fromPlayerId)} pays ${getPlayerName(
                game,
                settlement.toPlayerId
            )}: ${settlement.amount} (${settlement.reason})`
        );
    });

    lines.push("");

    lines.push("Net Results:");

    summary.netResults.forEach(result => {
        const playerName = getPlayerName(game, result.playerId);
        const sign = result.amount > 0 ? "+" : "";
        const amountText = `${sign}${result.amount}`;

        lines.push(
            `${playerName.padEnd(10)} ${amountText.padStart(6)}`
        );
    });

    return lines.join("\n");
}

export function buildGameStatusReport(
    game: Game
): string {
    const lines: string[] = [];

    lines.push("Current Game");
    lines.push(`Hand Number: ${game.handNumber}`);
    lines.push("");

    lines.push(`Round Wind: ${game.roundWind}`);
    lines.push(`East Wind: ${game.players[game.eastPlayerIndex]?.name ?? "Unknown"}`);
    lines.push("");

    lines.push("Seat Winds:");

    game.players.forEach(player => {
        const wind = getPlayerWind(
            player.seatPosition,
            game.eastPlayerIndex
        );

        lines.push(
            `${player.name.padEnd(10)} ${wind.padEnd(5)} (${getWindNumber(wind)})`
        );
    });

    lines.push("");

    lines.push("Current Totals:");

    game.players.forEach(player => {
        const sign = player.score > 0 ? "+" : "";
        const scoreText = `${sign}${player.score}`;

        lines.push(
            `${player.name.padEnd(10)} ${scoreText.padStart(6)}`
        );
    });

    return lines.join("\n");
}

export function buildHandHistoryReport(
    game: Game
): string {
    const lines: string[] = [];

    lines.push("Hand History");
    lines.push("");

    lines.push(
        game.players
            .map(player => player.name.padEnd(10))
            .join("")
    );

    game.hands.forEach(hand => {
        const row = game.players.map(player => {
            const playerResult = hand.players.find(
                result => result.playerId === player.id
            );

            if (!playerResult) {
                return "".padStart(10);
            }

            const scoreText =
                playerResult.handScore
                    .toString()
                    .padStart(4) +
                (playerResult.mahJongg ? "*" : "");

            return scoreText.padStart(10);
        });

        lines.push(row.join(""));
    });

    return lines.join("\n");
}

export function getHandHistoryRows(
    game: Game
): string[][] {
    return game.hands.map(hand =>
        game.players.map(player => {
            const result = hand.players.find(
                p => p.playerId === player.id
            );

            if (!result) {
                return "";
            }

            return (
                result.handScore.toString() +
                (result.mahJongg ? "*" : "")
            );
        })
    );
}
