import { Express } from "express";

import { getPlayerWind } from "../../models/game-utils";
import { Game } from "../../models/game";
import { getRackColorCss } from "../../models/rack-color";
import { getWindNumber } from "../../models/wind";
import { renderPage } from "../page-template";

export function registerHomeRoute(
    app: Express,
    getGame: () => Game
): void {
    app.get("/", (_req, res) => {
        const game = getGame();

        const eastPlayer = game.players[game.eastPlayerIndex];

        const playerRows = game.players
            .map(player => {
                const wind = getPlayerWind(
                    player.seatPosition,
                    game.eastPlayerIndex
                );

                const scoreText =
                    player.score > 0
                        ? `+${player.score}`
                        : `${player.score}`;

                const isEast = player.id === eastPlayer?.id;

                const playerNameStyle = isEast
                    ? `
                        background-color: ${getRackColorCss(player.rackColor)};
                        font-weight: bold;
                        border-left: 4px solid #333333;
                      `
                    : `
                        background-color: ${getRackColorCss(player.rackColor)};
                      `;

                return `
<tr>
    <td style="${playerNameStyle}">
        ${player.name}
    </td>
    <td>${wind} (${getWindNumber(wind)})</td>
    <td>${scoreText}</td>
</tr>
`;
            })
            .join("");

        res.send(
            renderPage(
                "MJScore",
                `
<h2>Current Game Status</h2>

<div class="card">
    <div style="margin-bottom: 0.75rem;">
        <strong>Hand Number:</strong>
        ${game.handNumber}
    </div>

    <table class="status-table">
        <tr>
            <td>
                <strong>Round Wind:</strong>
                ${game.roundWind}
            </td>

            <td>
                <strong>East Wind:</strong>
                <span
                    style="
                        background-color: ${eastPlayer
                            ? getRackColorCss(eastPlayer.rackColor)
                            : "transparent"};
                        padding: 0.15rem 0.5rem;
                        border-radius: 4px;
                    "
                >
                    ${eastPlayer?.name ?? "Unknown"}
                </span>
            </td>
        </tr>
    </table>
</div>

<table>
    <thead>
        <tr>
            <th>Player</th>
            <th>Seat Wind</th>
            <th>Current Total</th>
        </tr>
    </thead>

    <tbody>
        ${playerRows}
    </tbody>
</table>

<div class="actions">
    <a href="/score-hand"><button>Score Completed Hand</button></a>
    <a href="/history"><button>View Hand History</button></a>
    <a href="/save-game"><button>Save Game As</button></a>
    <a href="/load-game"><button>Load Saved Game</button></a>
    <a href="/new-game"><button>Start New Game</button></a>
</div>
`
            )
        );
    });
}