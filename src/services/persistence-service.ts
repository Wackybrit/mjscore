import { writeJsonAtomically } from "./atomic-file-service";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { Game } from "../models/game";
import { validateSavedGame } from "./saved-game-validation";

const DATA_DIRECTORY = path.join(process.cwd(), "data");
const SAVE_FILE_PATH = path.join(DATA_DIRECTORY, "current-game.json");
const SAVED_GAMES_DIRECTORY = path.join(DATA_DIRECTORY, "saved-games");

export class PersistenceError extends Error {
    constructor(message: string, public readonly status: number = 503) {
        super(message);
        this.name = "PersistenceError";
    }
}

function sanitizeFileName(fileName: string): string {
    if (typeof fileName !== "string") throw new PersistenceError("Enter a save name.", 400);
    const name = fileName.trim().replace(/[^a-z0-9-_ ]/gi, "")
        .replace(/\s+/g, "-").toLowerCase();
    if (!name) throw new PersistenceError("Save name cannot be empty.", 400);
    return name;
}

function writeGame(filePath: string, game: Game): void {
    try { validateSavedGame(game); }
    catch { throw new PersistenceError("This game could not be saved because its data is invalid. The previous save was kept.", 400); }
    try { writeJsonAtomically(filePath, game); }
    catch { throw new PersistenceError("The game could not be saved. The previous save was kept. Check available storage and data folder permissions, then try again."); }
}

function readGame(filePath: string): Game {
    let contents: string;
    try {
        contents = fs.readFileSync(filePath, "utf8");
    } catch {
        throw new PersistenceError("The saved game could not be read. Check that it still exists and the data folder is accessible. Your current game has not changed.");
    }
    try {
        const game: unknown = JSON.parse(contents);
        validateSavedGame(game);
        return game;
    } catch {
        throw new PersistenceError("This saved game is damaged or incompatible and could not be loaded. Your current game has not changed, and the saved file was kept. Choose another save or restore a backup.", 400);
    }
}

export function saveGame(game: Game): void {
    writeGame(SAVE_FILE_PATH, game);
}

export function loadGame(): Game | null {
    // Only a genuinely missing file means a new game; unreadable data must not be replaced.
    try {
        fs.lstatSync(SAVE_FILE_PATH);
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw new PersistenceError("The current game could not be read. Check the data folder permissions.");
    }
    return readGame(SAVE_FILE_PATH);
}

export function saveGameAs(game: Game, saveName: string): string {
    const filePath = path.join(SAVED_GAMES_DIRECTORY, `${sanitizeFileName(saveName)}.json`);
    writeGame(filePath, game);
    return filePath;
}

export interface NamedSaveSnapshot {
    name: string;
    fingerprint: string;
    game: Game | null;
}

// Read once so the reviewed game and its fingerprint describe the same bytes.
// A damaged save can still be reviewed before replacing it.
export function inspectNamedSave(saveName: string): NamedSaveSnapshot | null {
    const name = sanitizeFileName(saveName);
    let bytes: Buffer;
    try {
        bytes = fs.readFileSync(path.join(SAVED_GAMES_DIRECTORY, `${name}.json`));
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw new PersistenceError("The saved game could not be read. Check the data folder permissions. No changes were made.");
    }
    let game: Game | null = null;
    try {
        const value: unknown = JSON.parse(bytes.toString("utf8"));
        validateSavedGame(value);
        game = value;
    } catch { /* Keep the fingerprint available for reviewing a damaged save. */ }
    return { name, fingerprint: createHash("sha256").update(bytes).digest("hex"), game };
}

export function loadSavedGameSnapshot(saveName: string): NamedSaveSnapshot & { game: Game } {
    const save = inspectNamedSave(saveName);
    if (!save) throw new PersistenceError("The saved game could not be read. Check that it still exists. Your current game has not changed.");
    if (!save.game) throw new PersistenceError("This saved game is damaged or incompatible and could not be loaded. Your current game has not changed, and the saved file was kept. Choose another save or restore a backup.", 400);
    return { ...save, game: save.game };
}

export function loadSavedGame(saveName: string): Game {
    return loadSavedGameSnapshot(saveName).game;
}

export function listSavedGames(): string[] {
    try {
        return fs.readdirSync(SAVED_GAMES_DIRECTORY)
            .filter(fileName => fileName.endsWith(".json"))
            .map(fileName => fileName.slice(0, -5));
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
        throw new PersistenceError("Saved games could not be listed. Check the data folder permissions.");
    }
}
