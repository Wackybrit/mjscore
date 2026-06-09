"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerHistoryRoute = registerHistoryRoute;
const game_utils_1 = require("../../models/game-utils");
const scoring_service_1 = require("../../services/scoring-service");
const page_template_1 = require("../page-template");
const rack_color_1 = require("../../models/rack-color");
function registerHistoryRoute(app, getGame) {
    app.get("/history", (_req, res) => {
        const game = getGame();
        const runningTotals = new Map();
        game.players.forEach(player => {
            runningTotals.set(player.id, 0);
        });
        const tableRows = game.hands
            .map((hand, index) => {
            const scoreCells = game.players
                .map(player => {
                const result = hand.players.find(p => p.playerId === player.id);
                if (!result) {
                    return "<td></td>";
                }
                const score = result.handScore.toString();
                const playerColor = (0, rack_color_1.getRackColorCss)(player.rackColor);
                const style = result.mahJongg
                    ? ` style="background-color: ${playerColor}; font-weight: bold;"`
                    : "";
                return `<td${style}>${score}</td>`;
            })
                .join("");
            const settlements = (0, scoring_service_1.calculateSettlements)(hand);
            const netResults = (0, scoring_service_1.calculateNetResults)(settlements);
            netResults.forEach(result => {
                const currentTotal = runningTotals.get(result.playerId) ?? 0;
                runningTotals.set(result.playerId, currentTotal + result.amount);
            });
            const runningTotalCells = game.players
                .map(player => {
                const total = runningTotals.get(player.id) ?? 0;
                const sign = total > 0 ? "+" : "";
                return `<td>${sign}${total}</td>`;
            })
                .join("");
            return `
<tr>
    <td>${index + 1}</td>
    <td>${hand.roundWind}</td>
    <td>${(0, game_utils_1.getPlayerName)(game, hand.eastPlayerId)}</td>
    ${scoreCells}
    ${runningTotalCells}
</tr>
`;
        })
            .join("");
        const mahJonggCountCells = game.players
            .map(player => {
            const count = game.hands.filter(hand => hand.players.some(result => result.playerId === player.id &&
                result.mahJongg)).length;
            return `<td><strong>${count}</strong></td>`;
        })
            .join("");
        res.send((0, page_template_1.renderPage)("Hand History - MJScore", `
<h1>Hand History</h1>

<table>
    <thead>
        <tr>
            <th rowspan="2">Hand</th>
            <th rowspan="2">Round Wind</th>
            <th rowspan="2">East Wind</th>
            <th colspan="${game.players.length}">Hand Scores</th>
            <th colspan="${game.players.length}">Running Totals</th>
        </tr>
        <tr>
            ${game.players
            .map(player => `<th>${player.name}</th>`)
            .join("")}
            ${game.players
            .map(player => `<th>${player.name}</th>`)
            .join("")}
        </tr>
    </thead>

    <tbody>
        ${tableRows}

        <tr>
            <td colspan="3"><strong>Mah-Jongg Count</strong></td>
            ${mahJonggCountCells}
            ${game.players
            .map(() => "<td class='no-border'></td>")
            .join("")}
        </tr>

    </tbody>
</table>

<p>
    <a href="/">
        <button>Back to Current Game</button>
    </a>
</p>
`));
    });
}
//# sourceMappingURL=history-route.js.map