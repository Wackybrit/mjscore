"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveGame = saveGame;
exports.loadGame = loadGame;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const DATA_DIRECTORY = node_path_1.default.join(process.cwd(), "data");
const SAVE_FILE_PATH = node_path_1.default.join(DATA_DIRECTORY, "current-game.json");
function saveGame(game) {
    if (!node_fs_1.default.existsSync(DATA_DIRECTORY)) {
        node_fs_1.default.mkdirSync(DATA_DIRECTORY, {
            recursive: true
        });
    }
    node_fs_1.default.writeFileSync(SAVE_FILE_PATH, JSON.stringify(game, null, 4), "utf-8");
}
function loadGame() {
    if (!node_fs_1.default.existsSync(SAVE_FILE_PATH)) {
        return null;
    }
    const fileContents = node_fs_1.default.readFileSync(SAVE_FILE_PATH, "utf-8");
    return JSON.parse(fileContents);
}
//# sourceMappingURL=persistence-service.js.map