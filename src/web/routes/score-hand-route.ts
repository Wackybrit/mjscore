import { Express } from "express";

import { Game } from "../../models/game";
import { getPlayerWind } from "../../models/game-utils";
import { HandResult } from "../../models/hand-result";
import { getRackColorCss } from "../../models/rack-color";
import { getWindNumber } from "../../models/wind";
import { recordHand } from "../../services/game-service";
import { buildHandSummaryReport } from "../../services/reporting-service";
import {
    combineValidationResults,
    validateHandScores,
    validateMahJonggScore,
    validateMahJonggWinner
} from "../../services/validation-service";
import { renderPage } from "../page-template";

export function registerScoreHandRoute(
    app: Express,
    getGame: () => Game,
    setGame: (game: Game) => void
): void {
    app.get("/score-hand", (_req, res) => {
        const game = getGame();
        const eastPlayer = game.players[game.eastPlayerIndex];

        const scoreRows = game.players
            .map((player, index) => {
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
            ${index === 0 ? "autofocus" : ""}
        >
    </td>
</tr>
`;
            })
            .join("");

        const winnerRows = game.players
            .map(player => `
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
        >
    </td>
</tr>
`)
            .join("");

        res.send(
            renderPage(
                "Score Hand - MJScore",
                `
<h2>Score Completed Hand</h2>

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

<form method="POST" action="/score-hand">
    <h3>Scores</h3>

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
        <button type="submit">Score Hand</button>
        <a href="/"><button type="button">Back to Current Game</button></a>
    </div>
</form>
`
            )
        );
    });

    app.post("/score-hand", (req, res) => {
        const game = getGame();
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
                    "Score Entry Error - MJScore",
                    `
<h1>Score Entry Error</h1>

<p>Please correct the following problems:</p>

<ul>
    ${validation.errors
        .map(error => `<li>${error}</li>`)
        .join("")}
</ul>

<p>
    <a href="/score-hand"><button>Back to Score Entry</button></a>
</p>
`
                )
            );

            return;
        }

        const handResult: HandResult = {
            handNumber: game.handNumber,
            roundWind: game.roundWind,
            eastPlayerId: game.players[game.eastPlayerIndex]!.id,
            players: game.players.map((player, index) => ({
                playerId: player.id,
                handScore: scores[index]!,
                mahJongg: player.id === winnerId
            }))
        };

        const report = buildHandSummaryReport(
            game,
            handResult
        );

        const updatedGame = recordHand(
            game,
            handResult
        );

        setGame(updatedGame);

        res.redirect(`/hand/${handResult.handNumber}`);
    });
}
