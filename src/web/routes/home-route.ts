import { Express } from "express";

import { Game } from "../../models/game";
import { buildGameStatusReport } from "../../services/reporting-service";
import { renderPage } from "../page-template";

export function registerHomeRoute(
    app: Express,
    getGame: () => Game
): void {
    app.get("/", (_req, res) => {
        const game = getGame();

        res.send(
            renderPage(
                "MJScore",
                `
<h1>MJScore</h1>

<div class="report">
    <pre>${buildGameStatusReport(game)}</pre>
</div>

<p>
    <a href="/score-hand">
        <button>Score Completed Hand</button>
    </a>
</p>
<p>
    <a href="/history">
        <button>View Hand History</button>
    </a>
</p>
`
            )
        );
    });
}