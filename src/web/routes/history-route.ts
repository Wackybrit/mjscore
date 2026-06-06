import { Express } from "express";

import { getPlayerName } from "../../models/game-utils";
import { Game } from "../../models/game";
import { renderPage } from "../page-template";

export function registerHistoryRoute(
    app: Express,
    getGame: () => Game
): void {
    app.get("/history", (_req, res) => {
        const game = getGame();

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

                return `
<tr>
    <td>${index + 1}</td>
    <td>${hand.roundWind}</td>
    <td>${getPlayerName(game, hand.eastPlayerId)}</td>
    ${scoreCells}
</tr>
`;
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
            <th>Hand</th>
            <th>Round Wind</th>
            <th>East Wind</th>
            ${game.players
                .map(player => `<th>${player.name}</th>`)
                .join("")}
        </tr>
    </thead>

    <tbody>
        ${tableRows}
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