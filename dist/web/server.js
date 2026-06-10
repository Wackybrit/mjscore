"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServer = startServer;
const express_1 = __importDefault(require("express"));
const game_service_1 = require("../services/game-service");
const home_route_1 = require("./routes/home-route");
const score_hand_route_1 = require("./routes/score-hand-route");
const history_route_1 = require("./routes/history-route");
const persistence_service_1 = require("../services/persistence-service");
const save_load_route_1 = require("./routes/save-load-route");
const new_game_route_1 = require("./routes/new-game-route");
const hand_detail_route_1 = require("./routes/hand-detail-route");
const app = (0, express_1.default)();
const PORT = 3000;
app.use(express_1.default.urlencoded({ extended: true }));
let game = (0, persistence_service_1.loadGame)() ??
    (0, game_service_1.createGame)(["Nick", "Tasha", "Will", "Talia"], 0);
function getGame() {
    return game;
}
function setGame(updatedGame) {
    game = updatedGame;
    (0, persistence_service_1.saveGame)(game);
}
(0, home_route_1.registerHomeRoute)(app, getGame);
(0, score_hand_route_1.registerScoreHandRoute)(app, getGame, setGame);
(0, history_route_1.registerHistoryRoute)(app, getGame);
(0, save_load_route_1.registerSaveLoadRoute)(app, getGame, setGame);
(0, new_game_route_1.registerNewGameRoute)(app, setGame);
(0, hand_detail_route_1.registerHandDetailRoute)(app, getGame);
function startServer() {
    app.listen(PORT, () => {
        console.log(`MJScore listening on http://localhost:${PORT}`);
    });
}
//# sourceMappingURL=server.js.map