"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerHomeRoute = registerHomeRoute;
const game_utils_1 = require("../../models/game-utils");
const rack_color_1 = require("../../models/rack-color");
const wind_1 = require("../../models/wind");
const page_template_1 = require("../page-template");
function registerHomeRoute(app, getGame) {
    app.get("/", (_req, res) => {
        const game = getGame();
        const eastPlayer = game.players[game.eastPlayerIndex];
        const playerRows = game.players
            .map(player => {
            const wind = (0, game_utils_1.getPlayerWind)(player.seatPosition, game.eastPlayerIndex);
            const scoreText = player.score > 0
                ? `+${player.score}`
                : `${player.score}`;
            const isEast = player.id === eastPlayer?.id;
            const playerNameStyle = isEast
                ? `
                        background-color: ${(0, rack_color_1.getRackColorCss)(player.rackColor)};
                        font-weight: bold;
                        border-left: 4px solid #333333;
                      `
                : `
                        background-color: ${(0, rack_color_1.getRackColorCss)(player.rackColor)};
                      `;
            return `
<tr>
    <td style="${playerNameStyle}">
        ${player.name}
    </td>
    <td>${wind} (${(0, wind_1.getWindNumber)(wind)})</td>
    <td>${scoreText}</td>
</tr>
`;
        })
            .join("");
        res.send((0, page_template_1.renderPage)("MJScore", `
<h2>Current Game Status</h2>

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
            ? (0, rack_color_1.getRackColorCss)(eastPlayer.rackColor)
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

<div class="primary-action">
    <a href="/score-hand">
        <button>🀄 MAH-JONGG!</button>
    </a>
</div>`));
    });
}
//# sourceMappingURL=home-route.js.map