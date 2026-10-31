import { escapeHtml } from "../html-utils";
import { Express } from "express";

import { getPlayerName } from "../../models/game-utils";
import { Game } from "../../models/game";
import { calculateNetResults, calculateSettlements } from "../../services/scoring-service";
import { renderPage } from "../page-template";
import { getRackColorCss } from "../../models/rack-color";

export function registerHistoryRoute(
    app: Express,
    getGame: () => Game
): void {
    app.get("/history", (_req, res) => {
        const game = getGame();
        res.set("Cache-Control", "no-store");

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
                            result.handScore.toString() 

                        const playerColor = getRackColorCss(player.rackColor);
                        const style = result.mahJongg
                            ? ` class="rack-highlight" style="background-color: ${playerColor}; font-weight: bold;"`
                            : "";

                        return `<td${style}>${score}${hand.maxHandScore !== undefined && result.handScore > hand.maxHandScore ? `<span class="payment-note">settles as ${hand.maxHandScore}</span>` : ""}</td>`;
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
    <td>
        <a href="/hand/${hand.handNumber}">
            ${index + 1}
        </a>
        ${hand.deadHand ? '<br><strong>Dead Hand</strong>' : game.hands[index - 1]?.deadHand ? '<br>Replay' : ""}
    </td>
    <td>${hand.roundWind}</td>
    ${(() => {
        const eastPlayer = game.players.find(
            player => player.id === hand.eastPlayerId
        );

        if (!eastPlayer) {
            return "<td>Unknown</td>";
        }

        return `
    <td class="rack-highlight" style="background-color: ${getRackColorCss(eastPlayer.rackColor)};">
        ${escapeHtml(eastPlayer.name)}
    </td>
    `;
    })()}    
    ${scoreCells}
    <td class="spacer-column"></td>
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

            return `<td><strong>${count}</strong></td>`;
        })
        .join("");

        res.send(
            renderPage(
                "Hand History - MJScore",
                `
<h2>Hand History</h2>

<div class="table-scroll"><table class="history-table">
    <thead>
        <tr>
            <th rowspan="2">Hand</th>
            <th rowspan="2">Round Wind</th>
            <th rowspan="2">East Wind</th>
            <th colspan="${game.players.length}">Hand Scores</th>
            <th class="spacer-column"></th>
            <th colspan="${game.players.length}">Running Totals</th>
        </tr>
        <tr>
            ${game.players
                .map(player => `<th>${escapeHtml(player.name)}</th>`)
                .join("")}
            <th class="spacer-column"></th>
            ${game.players
                .map(player => `<th>${escapeHtml(player.name)}</th>`)
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
</table></div>

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