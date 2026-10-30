import { rackAccent, roundHeading, roundProgress } from "../game-display";
import { createGameFormGuard } from "../game-form-guard";
import { isGameOver, isReplayHand, recordDeadHand } from "../../services/game-service";
import { escapeHtml } from "../html-utils";
import { Express } from "express";

import { getPlayerWind } from "../../models/game-utils";
import { Game } from "../../models/game";
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

        const playerCards = game.players.map(player => {
            const wind = getPlayerWind(player.seatPosition, game.eastPlayerIndex);
            const east = player.id === game.players[game.eastPlayerIndex]!.id;
            return `<article class="player-card" style="--rack:${rackAccent(player.rackColor)}">
<div class="player-card-heading"><h3>${escapeHtml(player.name)}</h3>${east ? '<span class="east-badge">EAST</span>' : ""}</div>
<div class="seat-wind">${wind} <span class="wind-number">(${getWindNumber(wind)})</span></div>
<div class="player-total">${player.score > 0 ? "+" : ""}${player.score}</div><div class="score-caption">total points</div></article>`;
        }).join("");

        res.send(
            renderPage(
                "MJScore",
                `
${roundHeading(game, "Current Game Status")}
${isReplayHand(game) ? '<p class="replay-notice"><strong>Replay hand:</strong> Winds stay in place through any dead hands. East passes after the next completed hand, even if East wins.</p>' : ""}
<div class="player-cards">${playerCards}</div>
${roundProgress(game)}
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