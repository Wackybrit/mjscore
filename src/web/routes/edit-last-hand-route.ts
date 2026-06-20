import { Express } from "express";

import { getPlayerWind } from "../../models/game-utils";
import { Game } from "../../models/game";
import { HandResult } from "../../models/hand-result";
import { getRackColorCss } from "../../models/rack-color";
import { getWindNumber } from "../../models/wind";
import {
    rebuildGameFromHands
} from "../../services/game-service";
import { saveGame } from "../../services/persistence-service";
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
    app.get("/edit-last-hand", (_req, res) => {
        const game = getGame();
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
                    game.eastPlayerIndex
                );

                return `
<tr>
    <td style="background-color: ${getRackColorCss(player.rackColor)};">
        ${player.name}
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
</tr>
`;
            })
            .join("");

        const winnerRows = game.players
            .map(player => {
                const handPlayer = lastHand.players.find(
                    result => result.playerId === player.id
                );

                return `
<tr>
    <td style="background-color: ${getRackColorCss(player.rackColor)};">
        ${player.name}
    </td>
    <td>
        <input
            type="radio"
            name="winnerId"
            value="${player.id}"
            required
            ${handPlayer?.mahJongg ? "checked" : ""}
        >
    </td>
</tr>
`;
            })
            .join("");

        res.send(
            renderPage(
                "Edit Last Hand - MJScore",
                `
<h2>Edit Last Hand</h2>

<div class="card">
    <div style="margin-bottom: 0.75rem;">
        <strong>Hand Number:</strong>
        ${lastHand.handNumber}
    </div>

    <table class="status-table">
        <tr>
            <td>
                <strong>Round Wind:</strong>
                ${lastHand.roundWind}
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

<form method="POST" action="/edit-last-hand">
    <h3>Hand Scores</h3>

    <table>
        <thead>
            <tr>
                <th>Player</th>
                <th>Seat Wind</th>
                <th>Score</th>
            </tr>
        </thead>

        <tbody>
            ${scoreRows}
        </tbody>
    </table>

    <h3>Mah-Jongg Winner</h3>

    <table>
        <thead>
            <tr>
                <th>Player</th>
                <th>Mah-Jongg</th>
            </tr>
        </thead>

        <tbody>
            ${winnerRows}
        </tbody>
    </table>

    <div class="actions">
        <button type="submit">Save Corrected Hand</button>
        <a href="/hand/${lastHand.handNumber}">
            <button type="button">Cancel</button>
        </a>
    </div>
</form>
`
            )
        );
    });

    app.post("/edit-last-hand", (req, res) => {
        const game = getGame();
        const lastHand = game.hands.at(-1);

        if (!lastHand) {
            res.redirect("/");
            return;
        }

        const winnerId = req.body.winnerId as string | undefined;

        const scores = game.players.map(player =>
            Number(req.body[`score_${player.id}`])
        );

        const validation = combineValidationResults(
            validateHandScores(scores),
            validateMahJonggWinner(winnerId),
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
            players: game.players.map((player, index) => ({
                playerId: player.id,
                handScore: scores[index]!,
                mahJongg: player.id === winnerId
            }))
        };

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
        saveGame(rebuiltGame);

        res.redirect(`/hand/${correctedHand.handNumber}`);
    });
}