import fs from "node:fs";
import path from "node:path";

import { Game } from "../models/game";

const DATA_DIRECTORY = path.join(
    process.cwd(),
    "data"
);

const SAVE_FILE_PATH = path.join(
    DATA_DIRECTORY,
    "current-game.json"
);

const SAVED_GAMES_DIRECTORY = path.join(
    DATA_DIRECTORY,
    "saved-games"
);

function ensureDirectoryExists(
    directoryPath: string
): void {
    if (!fs.existsSync(directoryPath)) {
        fs.mkdirSync(directoryPath, {
            recursive: true
        });
    }
}

function sanitizeFileName(
    fileName: string
): string {
    return fileName
        .trim()
        .replace(/[^a-z0-9-_ ]/gi, "")
        .replace(/\s+/g, "-")
        .toLowerCase();
}

export function saveGame(
    game: Game
): void {
    ensureDirectoryExists(DATA_DIRECTORY);

    fs.writeFileSync(
        SAVE_FILE_PATH,
        JSON.stringify(game, null, 4),
        "utf-8"
    );
}

export function loadGame(): Game | null {
    if (!fs.existsSync(SAVE_FILE_PATH)) {
        return null;
    }

    const fileContents = fs.readFileSync(
        SAVE_FILE_PATH,
        "utf-8"
    );

    return JSON.parse(fileContents) as Game;
}

export function saveGameAs(
    game: Game,
    saveName: string
): string {
    ensureDirectoryExists(SAVED_GAMES_DIRECTORY);

    const safeFileName = sanitizeFileName(saveName);

    if (!safeFileName) {
        throw new Error("Save name cannot be empty.");
    }

    const filePath = path.join(
        SAVED_GAMES_DIRECTORY,
        `${safeFileName}.json`
    );

    fs.writeFileSync(
        filePath,
        JSON.stringify(game, null, 4),
        "utf-8"
    );

    return filePath;
}

export function loadSavedGame(
    saveName: string
): Game {
    const safeFileName = sanitizeFileName(saveName);

    const filePath = path.join(
        SAVED_GAMES_DIRECTORY,
        `${safeFileName}.json`
    );

    if (!fs.existsSync(filePath)) {
        throw new Error(`Saved game not found: ${saveName}`);
    }

    const fileContents = fs.readFileSync(
        filePath,
        "utf-8"
    );

    return JSON.parse(fileContents) as Game;
}

export function listSavedGames(): string[] {
    if (!fs.existsSync(SAVED_GAMES_DIRECTORY)) {
        return [];
    }

    return fs
        .readdirSync(SAVED_GAMES_DIRECTORY)
        .filter(fileName => fileName.endsWith(".json"))
        .map(fileName => fileName.replace(".json", ""));
}
