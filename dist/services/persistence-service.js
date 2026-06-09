"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveGame = saveGame;
exports.loadGame = loadGame;
exports.saveGameAs = saveGameAs;
exports.loadSavedGame = loadSavedGame;
exports.listSavedGames = listSavedGames;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const DATA_DIRECTORY = node_path_1.default.join(process.cwd(), "data");
const SAVE_FILE_PATH = node_path_1.default.join(DATA_DIRECTORY, "current-game.json");
const SAVED_GAMES_DIRECTORY = node_path_1.default.join(DATA_DIRECTORY, "saved-games");
function ensureDirectoryExists(directoryPath) {
    if (!node_fs_1.default.existsSync(directoryPath)) {
        node_fs_1.default.mkdirSync(directoryPath, {
            recursive: true
        });
    }
}
function sanitizeFileName(fileName) {
    return fileName
        .trim()
        .replace(/[^a-z0-9-_ ]/gi, "")
        .replace(/\s+/g, "-")
        .toLowerCase();
}
function saveGame(game) {
    ensureDirectoryExists(DATA_DIRECTORY);
    node_fs_1.default.writeFileSync(SAVE_FILE_PATH, JSON.stringify(game, null, 4), "utf-8");
}
function loadGame() {
    if (!node_fs_1.default.existsSync(SAVE_FILE_PATH)) {
        return null;
    }
    const fileContents = node_fs_1.default.readFileSync(SAVE_FILE_PATH, "utf-8");
    return JSON.parse(fileContents);
}
function saveGameAs(game, saveName) {
    ensureDirectoryExists(SAVED_GAMES_DIRECTORY);
    const safeFileName = sanitizeFileName(saveName);
    if (!safeFileName) {
        throw new Error("Save name cannot be empty.");
    }
    const filePath = node_path_1.default.join(SAVED_GAMES_DIRECTORY, `${safeFileName}.json`);
    node_fs_1.default.writeFileSync(filePath, JSON.stringify(game, null, 4), "utf-8");
    return filePath;
}
function loadSavedGame(saveName) {
    const safeFileName = sanitizeFileName(saveName);
    const filePath = node_path_1.default.join(SAVED_GAMES_DIRECTORY, `${safeFileName}.json`);
    if (!node_fs_1.default.existsSync(filePath)) {
        throw new Error(`Saved game not found: ${saveName}`);
    }
    const fileContents = node_fs_1.default.readFileSync(filePath, "utf-8");
    return JSON.parse(fileContents);
}
function listSavedGames() {
    if (!node_fs_1.default.existsSync(SAVED_GAMES_DIRECTORY)) {
        return [];
    }
    return node_fs_1.default
        .readdirSync(SAVED_GAMES_DIRECTORY)
        .filter(fileName => fileName.endsWith(".json"))
        .map(fileName => fileName.replace(".json", ""));
}
//# sourceMappingURL=persistence-service.js.map