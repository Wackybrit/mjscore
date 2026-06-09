import { Express } from "express";

import { getPlayerName } from "../../models/game-utils";
import { Game } from "../../models/game";
import { calculateNetResults, calculateSettlements } from "../../services/scoring-service";
import { renderPage } from "../page-template";

export function registerHistoryRoute(
    app: Express,
    getGame: () => Game
): void {
    app.get("/history", (_req, res) => {
        const game = getGame();

        const runningTotals = new Map<string, number>();

        game.players.forEach(player => {
            runningTotals.set(player.id, 0);
        });

        const tableRows = game.hands
            .map((hand, index) => {
                const scoreCells = game.players
                    .map(player => {
                        const result = hand.players.find(
                            p => p.playerId === player.id
                        );

                        if (!result) {
                            return "<td></td>";
                        }

                        const score =
                            result.handScore.toString() +
                            (result.mahJongg ? "*" : "");

                        return `<td>${score}</td>`;
                    })
                    .join("");

                const settlements = calculateSettlements(hand);
                const netResults = calculateNetResults(settlements);

                netResults.forEach(result => {
                    const currentTotal =
                        runningTotals.get(result.playerId) ?? 0;

                    runningTotals.set(
                        result.playerId,
                        currentTotal + result.amount
                    );
                });

                const runningTotalCells = game.players
                    .map(player => {
                        const total =
                            runningTotals.get(player.id) ?? 0;

                        const sign = total > 0 ? "+" : "";

                        return `<td>${sign}${total}</td>`;
                    })
                    .join("");

                return `
<tr>
    <td>${index + 1}</td>
    <td>${hand.roundWind}</td>
    <td>${getPlayerName(game, hand.eastPlayerId)}</td>
    ${scoreCells}
    ${runningTotalCells}
</tr>
`;
            })
            .join("");
    
        const mahJonggCountCells = game.players
        .map(player => {
            const count = game.hands.filter(hand =>
                hand.players.some(
                    result =>
                        result.playerId === player.id &&
                        result.mahJongg
                )
            ).length;

            return `<td>${count}</td>`;
        })
        .join("");

        res.send(
            renderPage(
                "Hand History - MJScore",
                `
<h1>Hand History</h1>

<table>
    <thead>
        <tr>
            <th rowspan="2">Hand</th>
            <th rowspan="2">Round Wind</th>
            <th rowspan="2">East Wind</th>
            <th colspan="${game.players.length}">Hand Scores</th>
            <th colspan="${game.players.length}">Running Totals</th>
        </tr>
        <tr>
            ${game.players
                .map(player => `<th>${player.name}</th>`)
                .join("")}
            ${game.players
                .map(player => `<th>${player.name}</th>`)
                .join("")}
        </tr>
    </thead>

    <tbody>
        ${tableRows}

        <tr>
            <td colspan="3"><strong>Mah-Jongg Count</strong></td>
            ${mahJonggCountCells}
            ${game.players
                .map(() => "<td class='no-border'></td>")
                .join("")}
        </tr>

    </tbody>
</table>

<p>
    <a href="/">
        <button>Back to Current Game</button>
    </a>
</p>
`
            )
        );
    });
}