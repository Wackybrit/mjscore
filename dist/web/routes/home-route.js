"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerHomeRoute = registerHomeRoute;
const reporting_service_1 = require("../../services/reporting-service");
const page_template_1 = require("../page-template");
function registerHomeRoute(app, getGame) {
    app.get("/", (_req, res) => {
        const game = getGame();
        res.send((0, page_template_1.renderPage)("MJScore", `
<h1>MJScore</h1>

<div class="report">
    <pre>${(0, reporting_service_1.buildGameStatusReport)(game)}</pre>
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
<p>
    <a href="/save-game">
        <button>Save Game As</button>
    </a>
</p>

<p>
    <a href="/load-game">
        <button>Load Saved Game</button>
    </a>
</p>
<p>
    <a href="/new-game">
        <button>Start New Game</button>
    </a>
</p>
`));
    });
}
//# sourceMappingURL=home-route.js.map