import { loadSettings } from "../../services/settings-service";
import { createGameFormGuard } from "../game-form-guard";
import { escapeHtml } from "../html-utils";
import { Express } from "express";

import { getPlayerWind } from "../../models/game-utils";
import { Game } from "../../models/game";
import { HandResult } from "../../models/hand-result";
import { getRackColorCss } from "../../models/rack-color";
import { getWindNumber } from "../../models/wind";
import {
    rebuildGameFromHands
} from "../../services/game-service";
import {
    combineValidationResults,
    validateHandScores,
    validateMahJonggScore,
    validateMahJonggWinner
} from "../../services/validation-service";
import { renderPage } from "../page-template";

export function registerEditLastHandRoute(
    app: Express,
    getGame: () => Game,
    setGame: (game: Game) => void
): void {
    const guard = createGameFormGuard("/edit-last-hand", "Open fresh correction form");
    app.get("/edit-last-hand", (_req, res) => {
        const game = getGame();
        res.set("Cache-Control", "no-store");
        const lastHand = game.hands.at(-1);

        if (!lastHand) {
            res.send(
                renderPage(
                    "Edit Last Hand - MJScore",
                    `
<h2>Edit Last Hand</h2>

<p>There are no completed hands to edit.</p>

<div class="actions">
    <a href="/"><button>Current Game</button></a>
</div>
`
                )
            );

            return;
        }

        const eastPlayer = game.players.find(
            player => player.id === lastHand.eastPlayerId
        );

        const scoreRows = game.players
            .map((player, index) => {
                const handPlayer = lastHand.players.find(
                    result => result.playerId === player.id
                );

                const wind = getPlayerWind(
                    player.seatPosition,
                    game.players.findIndex(p => p.id === lastHand.eastPlayerId)
                );

                return `
<tr>
    <td class="entry-player" style="background-color: ${getRackColorCss(player.rackColor)};">
        ${escapeHtml(player.name)}
    </td>
    <td>${wind} (${getWindNumber(wind)})</td>
    <td>
        <input
            type="number"
            name="score_${player.id}"
            min="0"
            step="2"
            required
            value="${handPlayer?.handScore ?? 0}"
            ${index === 0 ? "autofocus" : ""}
        >
    </td>
    <td><label class="winner-choice"><input type="radio" name="winnerId" value="${player.id}" ${handPlayer?.mahJongg ? "checked" : ""} required aria-label="${escapeHtml(player.name)} Mah-Jongg winner">Mah-Jongg</label></td>
</tr>
`;
            })
            .join("");

        res.send(
            renderPage(
                "Edit Last Hand - MJScore",
                `
<div class="page-heading"><div><p class="eyebrow">Hand ${lastHand.handNumber}</p><h2>Edit Last Hand</h2></div>
<div class="round-summary"><div><strong>${lastHand.roundWind} round</strong><small>East: ${escapeHtml(eastPlayer?.name ?? "Unknown")}</small></div></div></div>

<form method="POST" action="/edit-last-hand">
    <input type="hidden" name="gameToken" value="${guard.tokenFor(game, lastHand.deadHand ? String(loadSettings().maxHandScore) : "")}">
    <div class="outcome-controls"><label>Hand outcome:
        <select name="handOutcome" id="hand-outcome">
            <option value="completed" ${lastHand.deadHand ? "" : "selected"}>Completed hand</option>
            <option value="dead" ${lastHand.deadHand ? "selected" : ""}>Dead hand</option>
        </select>
    </label><p class="muted">Dead hands have zero scores and no winner.</p></div>
    <table class="entry-table"><thead><tr><th>Player</th><th>Seat Wind</th><th>Raw score</th><th>Winner</th></tr></thead><tbody>${scoreRows}</tbody></table>

    <div class="actions">
        <button type="submit">Save Corrected Hand</button>
        <a href="/hand/${lastHand.handNumber}">
            <button type="button">Cancel</button>
        </a>
    </div>
</form>
<script>
    const outcome = document.getElementById("hand-outcome");
    function updateOutcome() {
        const dead = outcome.value === "dead";
        document.querySelectorAll('[name^="score_"], [name="winnerId"]').forEach(input => {
            input.disabled = dead;
            input.required = !dead;
        });
    }
    outcome.addEventListener("change", updateOutcome);
    updateOutcome();
</script>
`
            )
        );
    });

    app.post("/edit-last-hand", (req, res) => {
        const game = getGame();
        if (!guard.accept(game, req.body?.gameToken, res, game.hands.at(-1)?.deadHand ? String(loadSettings().maxHandScore) : "")) return;
        const lastHand = game.hands.at(-1);

        if (!lastHand) {
            res.redirect("/");
            return;
        }

        const deadHand = req.body.handOutcome === "dead";
        const winnerId = req.body.winnerId as string | undefined;

        const scores = game.players.map(player =>
            typeof req.body[`score_${player.id}`] === "string" &&
            req.body[`score_${player.id}`].trim() !== ""
                ? Number(req.body[`score_${player.id}`]) : NaN
        );

        const validation = deadHand ? { valid: true, errors: [] } : combineValidationResults(
            validateHandScores(scores),
            validateMahJonggWinner(winnerId, game.players.map(player => player.id)),
            validateMahJonggScore(
                scores,
                winnerId,
                game.players.map(player => player.id)
            )
        );

        if (!validation.valid) {
            res.send(
                renderPage(
                    "Edit Last Hand Error - MJScore",
                    `
<h2>Edit Last Hand Error</h2>

<p>Please correct the following problems:</p>

<ul>
    ${validation.errors
        .map(error => `<li>${error}</li>`)
        .join("")}
</ul>

<div class="actions">
    <a href="/edit-last-hand">
        <button>Edit Last Hand</button>
    </a>
</div>
`
                )
            );

            return;
        }

        const correctedHand: HandResult = {
            ...lastHand,
            deadHand,
            players: game.players.map((player, index) => ({
                playerId: player.id,
                handScore: deadHand ? 0 : scores[index]!,
                mahJongg: !deadHand && player.id === winnerId
            }))
        };

        if (!deadHand) {
            delete correctedHand.deadHand;
            if (lastHand.deadHand) correctedHand.maxHandScore = loadSettings().maxHandScore;
        }

        const previousHands = game.hands.slice(
            0,
            -1
        );

        const rebuiltGame = rebuildGameFromHands(
            {
                ...game,
                hands: []
            },
            [
                ...previousHands,
                correctedHand
            ]
        );

        setGame(rebuiltGame);

        res.redirect(`/hand/${correctedHand.handNumber}`);
    });
}