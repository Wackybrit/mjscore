import { escapeHtml } from "../html-utils";
import { Express } from "express";

import { Game } from "../../models/game";
import { getRackColorCss } from "../../models/rack-color";
import { validatePlayerNames } from "../../services/validation-service";
import { renderPage } from "../page-template";

export function registerEditPlayersRoute(
    app: Express,
    getGame: () => Game,
    setGame: (game: Game) => void
): void {
    app.get("/edit-players", (_req, res) => {
        const game = getGame();

        const playerRows = game.players
            .map((player, index) => `
<tr>
    <td class="rack-highlight" style="background-color: ${getRackColorCss(player.rackColor)};">
        ${player.rackColor}
    </td>
    <td>${escapeHtml(player.name)}</td>
    <td>
        <input
            type="text"
            name="playerName_${index}"
            value="${escapeHtml(player.name)}"
            required
            pattern=".*\\S.*"
            title="Player name cannot be blank."
            ${index === 0 ? "autofocus" : ""}
        >
    </td>
</tr>
`)
            .join("");

        res.send(
            renderPage(
                "Edit Players - MJScore",
                `
<h2>Edit Players</h2>

<form method="POST" action="/edit-players">
    <div class="table-scroll"><table>
        <thead>
            <tr>
                <th>Rack Color</th>
                <th>Current Name</th>
                <th>New Name</th>
            </tr>
        </thead>

        <tbody>
            ${playerRows}
        </tbody>
    </table></div>

    <div class="actions">
        <button type="submit">Save Player Names</button>
        <a href="/"><button type="button">Cancel</button></a>
    </div>
</form>
`
            )
        );
    });

    app.post("/edit-players", (req, res) => {
        const game = getGame();

        const newNames = game.players.map((_, index) =>
            typeof req.body[`playerName_${index}`] === "string"
                ? req.body[`playerName_${index}`].trim() : ""
        );

        const validation = validatePlayerNames(newNames);

        if (!validation.valid) {
            res.send(
                renderPage(
                    "Edit Players Error - MJScore",
                    `
<h2>Edit Players Error</h2>

<p>Please correct the following problems:</p>

<ul>
    ${validation.errors
        .map(error => `<li>${error}</li>`)
        .join("")}
</ul>

<p>
    <a href="/edit-players"><button>Edit Players</button></a>
</p>
`
                )
            );

            return;
        }

        const updatedGame: Game = {
            ...game,
            players: game.players.map((player, index) => ({
                ...player,
                name: newNames[index]!
            }))
        };

        setGame(updatedGame);

        res.redirect("/");
    });
}