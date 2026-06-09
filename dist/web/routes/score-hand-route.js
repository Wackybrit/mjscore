"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerScoreHandRoute = registerScoreHandRoute;
const game_service_1 = require("../../services/game-service");
const reporting_service_1 = require("../../services/reporting-service");
const page_template_1 = require("../page-template");
const validation_service_1 = require("../../services/validation-service");
function registerScoreHandRoute(app, getGame, setGame) {
    app.get("/score-hand", (_req, res) => {
        const game = getGame();
        res.send((0, page_template_1.renderPage)("Score Hand - MJScore", `
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
`));
    });
    app.post("/score-hand", (req, res) => {
        const game = getGame();
        const winnerId = req.body.winnerId;
        const scores = game.players.map(player => Number(req.body[`score_${player.id}`]));
        const validation = (0, validation_service_1.combineValidationResults)((0, validation_service_1.validateHandScores)(scores), (0, validation_service_1.validateMahJonggWinner)(winnerId));
        if (!validation.valid) {
            res.send((0, page_template_1.renderPage)("Score Entry Error - MJScore", `
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
`));
            return;
        }
        const handResult = {
            handNumber: game.handNumber,
            roundWind: game.roundWind,
            eastPlayerId: game.players[game.eastPlayerIndex].id,
            players: game.players.map((player, index) => ({
                playerId: player.id,
                handScore: scores[index],
                mahJongg: player.id === winnerId
            }))
        };
        const report = (0, reporting_service_1.buildHandSummaryReport)(game, handResult);
        const updatedGame = (0, game_service_1.recordHand)(game, handResult);
        setGame(updatedGame);
        res.send((0, page_template_1.renderPage)("Hand Summary - MJScore", `
<h1>Hand Summary</h1>

<div class="report">
    <pre>${report}</pre>
</div>

<p>
    <a href="/">
        <button>Continue to Next Hand</button>
    </a>
</p>
`));
    });
}
//# sourceMappingURL=score-hand-route.js.map