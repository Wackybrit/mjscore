import { Express } from "express";
import { createGameFormGuard } from "../game-form-guard";
import { escapeHtml } from "../html-utils";
import { roundHeading } from "../game-display";
import { Game } from "../../models/game";
import { getPlayerWind } from "../../models/game-utils";
import { HandResult } from "../../models/hand-result";
import { getRackColorCss } from "../../models/rack-color";
import { getWindNumber } from "../../models/wind";
import { isGameOver, isReplayHand, recordHand } from "../../services/game-service";
import { loadSettings } from "../../services/settings-service";
import { combineValidationResults, validateHandScores, validateMahJonggScore, validateMahJonggWinner } from "../../services/validation-service";
import { renderPage } from "../page-template";

export function registerScoreHandRoute(app: Express, getGame: () => Game, setGame: (game: Game) => void): void {
    const guard = createGameFormGuard("/score-hand", "Open fresh score form");
    app.get("/score-hand", (_req, res) => {
        const game = getGame();
        res.set("Cache-Control", "no-store");
        if (isGameOver(game)) { res.redirect(303, "/game-over"); return; }
        const { maxHandScore } = loadSettings();
        const rows = game.players.map((player, index) => {
            const wind = getPlayerWind(player.seatPosition, game.eastPlayerIndex);
            return `<tr><td class="entry-player" style="background-color:${getRackColorCss(player.rackColor)}">${escapeHtml(player.name)}</td>
<td class="entry-wind">${wind} (${getWindNumber(wind)})</td>
<td><input type="number" name="score_${player.id}" aria-label="${escapeHtml(player.name)} raw score" min="0" step="2" required inputmode="numeric" ${index === 0 ? "autofocus" : ""}></td>
<td><label class="winner-choice"><input type="radio" name="winnerId" value="${player.id}" aria-label="${escapeHtml(player.name)} Mah-Jongg winner" required>Mah-Jongg</label></td></tr>`;
        }).join("");
        res.send(renderPage("Score Hand - MJScore", `
${roundHeading(game, "Score Completed Hand")}
${isReplayHand(game) ? '<p class="replay-notice"><strong>Replay hand:</strong> Payments are normal. East passes after this completed hand, even if East wins.</p>' : ""}
<p class="muted">Enter the full scores. Payments use a maximum of <strong>${maxHandScore}</strong> per player, before East’s doubling.</p>
<form method="POST" action="/score-hand">
<input type="hidden" name="gameToken" value="${guard.tokenFor(game, String(maxHandScore))}">
<table class="entry-table"><thead><tr><th>Player</th><th>Seat wind</th><th>Raw score</th><th>Winner</th></tr></thead><tbody>${rows}</tbody></table>
<div class="actions"><button class="button-primary" type="submit">Score Hand</button><a href="/" class="button">Back to Current Game</a></div></form>`));
    });
    app.post("/score-hand", (req, res) => {
        const game = getGame();
        if (isGameOver(game)) { res.redirect(303, "/game-over"); return; }
        const { maxHandScore } = loadSettings();
        if (!guard.accept(game, req.body?.gameToken, res, String(maxHandScore))) return;
        const winnerId = req.body.winnerId as string | undefined;
        const scores = game.players.map(player => typeof req.body[`score_${player.id}`] === "string" && req.body[`score_${player.id}`].trim() !== "" ? Number(req.body[`score_${player.id}`]) : NaN);
        const validation = combineValidationResults(validateHandScores(scores), validateMahJonggWinner(winnerId, game.players.map(p => p.id)), validateMahJonggScore(scores, winnerId, game.players.map(p => p.id)));
        if (!validation.valid) {
            res.send(renderPage("Score Entry Error - MJScore", `<h2>Score Entry Error</h2><p>Please correct the following problems:</p><ul>${validation.errors.map(error => `<li>${escapeHtml(error)}</li>`).join("")}</ul><a class="button" href="/score-hand">Back to Score Entry</a>`));
            return;
        }
        const handResult: HandResult = {
            handNumber: game.handNumber, roundWind: game.roundWind,
            eastPlayerId: game.players[game.eastPlayerIndex]!.id,
            maxHandScore,
            players: game.players.map((player, index) => ({ playerId: player.id, handScore: scores[index]!, mahJongg: player.id === winnerId }))
        };
        setGame(recordHand(game, handResult));
        res.redirect(`/hand/${handResult.handNumber}`);
    });
}
