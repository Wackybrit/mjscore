import { Express } from "express";

import { Game } from "../../models/game";
import { HandResult } from "../../models/hand-result";
import { recordHand } from "../../services/game-service";
import { buildHandSummaryReport } from "../../services/reporting-service";
import { renderPage } from "../page-template";

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
    ${game.players.map(player => `
        <div>
            <label>
                ${player.name} Score:
                <input 
                    type="number" 
                    name="score_${player.id}" 
                    required
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

        const handResult: HandResult = {
            handNumber: game.handNumber,
            roundWind: game.roundWind,
            eastPlayerId: game.players[game.eastPlayerIndex]!.id,
            players: game.players.map(player => ({
                playerId: player.id,
                handScore: Number(req.body[`score_${player.id}`]),
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
