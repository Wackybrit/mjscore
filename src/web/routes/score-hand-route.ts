import { Express } from "express";

import { Game } from "../../models/game";
import { HandResult } from "../../models/hand-result";
import { recordHand } from "../../services/game-service";
import { buildHandSummaryReport } from "../../services/reporting-service";
import { renderPage } from "../page-template";
import {
    combineValidationResults,
    validateHandScores,
    validateMahJonggWinner
} from "../../services/validation-service";

export function registerScoreHandRoute(
    app: Express,
    getGame: () => Game,
    setGame: (game: Game) => void
): void {
    app.get("/score-hand", (_req, res) => {
        const game = getGame();

        res.send(
            renderPage(
                "Score Hand - MJScore",
                `
<h1>Score Completed Hand</h1>

<form method="POST" action="/score-hand">
    ${game.players.map((player, index) => `
        <div>
            <label>
                ${player.name} Score:
                <input 
                    type="number" 
                    name="score_${player.id}" 
                    min="0"
                    step="2"
                    required
                    ${index === 0 ? "autofocus" : ""}
                >
            </label>

            <label>
                <input 
                    type="radio" 
                    name="winnerId" 
                    value="${player.id}" 
                    required
                >
                Mah-Jongg
            </label>
        </div>
    `).join("")}

    <p>
        <button type="submit">Score Hand</button>
    </p>
</form>

<p>
    <a href="/">Back to Current Game</a>
</p>
`
            )
        );
    });

    app.post("/score-hand", (req, res) => {
        const game = getGame();
        const winnerId = req.body.winnerId as string;

        const scores = game.players.map(player =>
            Number(req.body[`score_${player.id}`])
        );

        const validation = combineValidationResults(
            validateHandScores(scores),
            validateMahJonggWinner(winnerId)
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
    <a href="/score-hand">
        <button>Back to Score Entry</button>
    </a>
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

        res.send(
            renderPage(
                "Hand Summary - MJScore",
                `
<h1>Hand Summary</h1>

<div class="report">
    <pre>${report}</pre>
</div>

<p>
    <a href="/">
        <button>Continue to Next Hand</button>
    </a>
</p>
`
            )
        );
    });
}