import { registerSettingsRoute } from "./routes/settings-route";
import { registerGameOverRoute } from "./routes/game-over-route";
import express from "express";
import { PersistenceError } from "../services/persistence-service";
import { renderPage } from "./page-template";
import { escapeHtml } from "./html-utils";

import { Game } from "../models/game";
import { createGame } from "../services/game-service";
import { registerHomeRoute } from "./routes/home-route";
import { registerScoreHandRoute } from "./routes/score-hand-route";
import { registerHistoryRoute } from "./routes/history-route";
import { loadGame, saveGame } from "../services/persistence-service";
import { registerSaveLoadRoute } from "./routes/save-load-route";
import { registerNewGameRoute } from "./routes/new-game-route";
import { registerHandDetailRoute } from "./routes/hand-detail-route";
import { registerEditPlayersRoute } from "./routes/edit-players-route";
import { registerEditLastHandRoute } from "./routes/edit-last-hand-route";

// Each app owns its active game; saving must finish before it becomes visible.
export function createApp(): express.Express {
    const app = express();
    app.use(express.urlencoded({ extended: true }));
    let game: Game;
    try {
        game = loadGame() ?? createGame(["Nick", "Tasha", "Will", "Talia"], 0);
    } catch (error) {
        console.error("MJScore could not load the current game:", error);
        // Keep damaged/unreadable current data untouched. Do not start a fallback
        // game that could silently overwrite it on the next hand submission.
        app.use((_req, res) => {
            res.status(503).send(renderPage("Current game unavailable - MJScore", `
<h2>Current game could not be loaded</h2>
<p>The current game file is damaged, incompatible, or unreadable. It has been left unchanged.</p>
<p>Stop MJScore, keep a copy of the data folder, and restore current-game.json from a known good backup or correct its file permissions. Then restart MJScore.</p>
<p>No game changes can be made until the current game is recovered.</p>`));
        });
        return app;
    }
    const getGame = (): Game => game;
    const setGame = (updatedGame: Game): void => {
        saveGame(updatedGame);
        game = updatedGame;
    };
    registerSettingsRoute(app);
    registerHomeRoute(app, getGame, setGame);
    registerGameOverRoute(app, getGame);
    registerScoreHandRoute(app, getGame, setGame);
    registerHistoryRoute(app, getGame);
    registerSaveLoadRoute(app, getGame, setGame);
    registerNewGameRoute(app, getGame, setGame);
    registerHandDetailRoute(app, getGame);
    registerEditPlayersRoute(app, getGame, setGame);
    registerEditLastHandRoute(app, getGame, setGame);
    app.use((error: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
        if (!(error instanceof PersistenceError)) {
            next(error);
            return;
        }
        res.status(error.status).send(renderPage("Action not completed - MJScore", `
<h2>Action not completed</h2>
<p>${escapeHtml(error.message)}</p>
<p><a href="/">Current game</a> · <a href="/load-game">Saved games</a></p>`));
    });
    return app;
}

export function startServer(): void {
    createApp().listen(3000, () => {
        console.log("MJScore listening on http://localhost:3000");
    });
}
