import { Express } from "express";

import { Game } from "../../models/game";
import { RackColor } from "../../models/rack-color";
import { Wind, WIND_ORDER } from "../../models/wind";
import { createGame } from "../../services/game-service";
import { saveGame } from "../../services/persistence-service";
import {
    combineValidationResults,
    validatePlayerNames,
    validateRackColors,
    validateStartingWinds
} from "../../services/validation-service";
import { renderPage } from "../page-template";

type NewGamePlayerEntry = {
    name: string;
    startingWind: Wind;
    rackColor: RackColor;
};

export function registerNewGameRoute(
    app: Express,
    setGame: (game: Game) => void
): void {
    app.get("/new-game", (_req, res) => {
        res.send(
            renderPage(
                "New Game - MJScore",
                `
<h1>Start New Game</h1>

<form method="POST" action="/new-game">
    <h2>Players</h2>

    ${[0, 1, 2, 3].map(index => `
        <div>
            <label>
                Player ${index + 1} Name:
                <input 
                    type="text" 
                    name="playerName_${index}" 
                    required
                    ${index === 0 ? "autofocus" : ""}
                >
            </label>

            <label>
                Starting Wind:
                <select 
                    name="startingWind_${index}" 
                    class="wind-select"
                    required
                >
                    <option value="">Select Wind</option>
                    <option value="${Wind.East}">East (1)</option>
                    <option value="${Wind.South}">South (2)</option>
                    <option value="${Wind.West}">West (3)</option>
                    <option value="${Wind.North}">North (4)</option>
                </select>
            </label>

            <label>
                Rack Color:
                <select
                    name="rackColor_${index}"
                    class="rack-color-select"
                    required
                >
                    <option value="">Select Color</option>
                    <option value="${RackColor.Red}">Red</option>
                    <option value="${RackColor.Blue}">Blue</option>
                    <option value="${RackColor.Green}">Green</option>
                    <option value="${RackColor.Yellow}">Yellow</option>
                </select>
            </label>
        </div>
    `).join("")}

    <p>
        <button type="submit">Start Game</button>
    </p>
</form>

<p>
    <a href="/">
        <button>Cancel</button>
    </a>
</p>

<script>
    function preventDuplicateSelections(selector) {
        const selects = Array.from(
            document.querySelectorAll(selector)
        );

        function updateOptions() {
            const selectedValues = selects
                .map(select => select.value)
                .filter(value => value !== "");

            selects.forEach(select => {
                const currentValue = select.value;

                Array.from(select.options).forEach(option => {
                    if (option.value === "") {
                        option.disabled = false;
                        return;
                    }

                    option.disabled =
                        selectedValues.includes(option.value) &&
                        option.value !== currentValue;
                });
            });
        }

        selects.forEach(select => {
            select.addEventListener(
                "change",
                updateOptions
            );
        });

        updateOptions();
    }

    preventDuplicateSelections(".wind-select");
    preventDuplicateSelections(".rack-color-select");
</script>
`
            )
        );
    });

    app.post("/new-game", (req, res) => {
        const entries: NewGamePlayerEntry[] = [0, 1, 2, 3].map(index => ({
            name: String(req.body[`playerName_${index}`]).trim(),
            startingWind: req.body[`startingWind_${index}`] as Wind,
            rackColor: req.body[`rackColor_${index}`] as RackColor
        }));

        const validation = combineValidationResults(
            validatePlayerNames(entries.map(entry => entry.name)),
            validateStartingWinds(entries.map(entry => entry.startingWind)),
            validateRackColors(entries.map(entry => entry.rackColor))
        );

        if (!validation.valid) {
            res.send(
                renderPage(
                    "New Game Error - MJScore",
                    `
<h1>New Game Error</h1>

<p>Please correct the following problems:</p>

<ul>
    ${validation.errors
        .map(error => `<li>${error}</li>`)
        .join("")}
</ul>

<p>
    <a href="/new-game">
        <button>Back to New Game</button>
    </a>
</p>
`
                )
            );

            return;
        }

        const sortedEntries = WIND_ORDER.map(wind => {
            const entry = entries.find(
                playerEntry => playerEntry.startingWind === wind
            );

            if (!entry) {
                throw new Error(`Missing player for wind: ${wind}`);
            }

            return entry;
        });

        const newGame = createGame(
            sortedEntries.map(entry => entry.name),
            0,
            sortedEntries.map(entry => entry.rackColor)
        );

        setGame(newGame);
        saveGame(newGame);

        res.redirect("/");
    });
}