import express from "express";

import { Game } from "../models/game";
import { createGame } from "../services/game-service";
import { registerHomeRoute } from "./routes/home-route";
import { registerScoreHandRoute } from "./routes/score-hand-route";
import { registerHistoryRoute } from "./routes/history-route";
import { loadGame, saveGame } from "../services/persistence-service";

const app = express();
const PORT = 3000;

app.use(express.urlencoded({ extended: true }));

let game: Game =
    loadGame() ??
    createGame(
        ["Nick", "Tasha", "Will", "Talia"],
        0
    );

function getGame(): Game {
    return game;
}

function setGame(
    updatedGame: Game
): void {
    game = updatedGame;
    saveGame(game);
}

registerHomeRoute(app, getGame);
registerScoreHandRoute(app, getGame, setGame);
registerHistoryRoute(app, getGame);

export function startServer(): void {
    app.listen(PORT, () => {
        console.log(`MJScore listening on http://localhost:${PORT}`);
    });
}