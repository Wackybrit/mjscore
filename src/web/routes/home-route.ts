import { createGameFormGuard } from "../game-form-guard";
import { isGameOver, isReplayHand, recordDeadHand } from "../../services/game-service";
import { escapeHtml } from "../html-utils";
import { Express } from "express";

import { getPlayerWind } from "../../models/game-utils";
import { Game } from "../../models/game";
import { getRackColorCss } from "../../models/rack-color";
import { getWindNumber } from "../../models/wind";
import { renderPage } from "../page-template";

export function registerHomeRoute(
    app: Express,
    getGame: () => Game,
    setGame: (game: Game) => void
): void {
    const deadHandGuard = createGameFormGuard("/", "Open Current Game");
    app.post("/dead-hand", (req, res) => {
        const game = getGame();
        if (isGameOver(game)) {
            res.redirect(303, "/game-over");
            return;
        }
        if (!deadHandGuard.accept(game, req.body?.gameToken, res)) return;
        const updatedGame = recordDeadHand(game);
        setGame(updatedGame);
        res.redirect(303, `/hand/${game.handNumber}`);
    });
    app.get("/", (_req, res) => {
        const game = getGame();
        res.set("Cache-Control", "no-store");
        if (isGameOver(game)) {
            res.send(renderPage("Game complete - MJScore", `
<h2>Game complete</h2>
<p>The fourth player has lost East in the second North round. All ${game.hands.length} hands have been scored.</p>
<div class="primary-action"><a href="/game-over"><button>Game Over</button></a></div>
<div class="actions"><a href="/history">View history</a> · <a href="/edit-last-hand">Edit Last Hand</a> · <a href="/save-game">Save game</a></div>`, true));
            return;
        }

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
        ${escapeHtml(player.name)}
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
${isReplayHand(game) ? '<p class="replay-notice"><strong>Replay hand:</strong> Winds stay in place through any dead hands. East passes after the next completed hand, even if East wins.</p>' : ""}

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
                    ${escapeHtml(eastPlayer?.name ?? "Unknown")}
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

<div class="primary-action game-actions">
    <a href="/score-hand">
        <button>🀄 MAH-JONGG!</button>
    </a>
    <form method="POST" action="/dead-hand">
        <input type="hidden" name="gameToken" value="${deadHandGuard.tokenFor(game)}">
        <button type="submit">Dead Hand</button>
    </form>
</div>`
            )
        );
    });
}