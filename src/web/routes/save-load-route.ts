import { Express } from "express";

import { Game } from "../../models/game";
import {
    listSavedGames,
    loadSavedGame,
    saveGame,
    saveGameAs
} from "../../services/persistence-service";
import { renderPage } from "../page-template";

export function registerSaveLoadRoute(
    app: Express,
    getGame: () => Game,
    setGame: (game: Game) => void
): void {
    app.get("/save-game", (_req, res) => {
        res.send(
            renderPage(
                "Save Game - MJScore",
                `
<h2>Save Current Game</h2>

<form method="POST" action="/save-game">
    <label>
        Save Name:
        <input type="text" name="saveName" required autofocus>
    </label>

    <p>
        <button type="submit">Save Game</button>
    </p>
</form>

<p>
    <a href="/">
        <button>Back to Current Game</button>
    </a>
</p>
`
            )
        );
    });

    app.post("/save-game", (req, res) => {
        const saveName = req.body.saveName as string;

        saveGameAs(
            getGame(),
            saveName
        );

        res.send(
            renderPage(
                "Game Saved - MJScore",
                `
<h2>Game Saved</h2>

<p>Saved game as: <strong>${saveName}</strong></p>

<p>
    <a href="/">
        <button>Back to Current Game</button>
    </a>
</p>
`
            )
        );
    });

    app.get("/load-game", (_req, res) => {
        const savedGames = listSavedGames();

        res.send(
            renderPage(
                "Load Game - MJScore",
                `
<h2>Load Saved Game</h2>

${savedGames.length === 0
    ? "<p>No saved games found.</p>"
    : `
<form method="POST" action="/load-game">
    ${savedGames.map(saveName => `
        <div>
            <label>
                <input type="radio" name="saveName" value="${saveName}" required>
                ${saveName}
            </label>
        </div>
    `).join("")}

    <p>
        <button type="submit">Load Game</button>
    </p>
</form>
`
}

<p>
    <a href="/">
        <button>Back to Current Game</button>
    </a>
</p>
`
            )
        );
    });

    app.post("/load-game", (req, res) => {
        const saveName = req.body.saveName as string;

        const loadedGame = loadSavedGame(saveName);

        setGame(loadedGame);
        saveGame(loadedGame);

        res.redirect("/");
    });
}