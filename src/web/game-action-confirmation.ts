import { randomBytes } from "node:crypto";
import { Express, Response } from "express";
import { Game } from "../models/game";
import { inspectNamedSave, NamedSaveSnapshot, saveGameAs } from "../services/persistence-service";
import { escapeHtml } from "./html-utils";
import { renderPage } from "./page-template";

type Action = { kind: "new"; replacement: Game } |
    { kind: "load" | "save"; replacement: Game; save: NamedSaveSnapshot };
type Pending = { action: Action; current: Game; expires: number };

function summary(game: Game | null): string {
    if (!game) return "<p>This saved file is damaged or incompatible. Its game details are unavailable.</p>";
    return `<p>Players: ${game.players.map(p => escapeHtml(p.name)).join(", ")}<br>Completed hands: ${game.hands.length}</p>`;
}

// Keep reviewed values on the server: a confirmation cannot change the selected
// save or new players, and cannot silently replace a game changed in another tab.
export function registerGameActionConfirmation(
    app: Express,
    endpoint: string,
    getGame: () => Game,
    setGame: (game: Game) => void
) {
    const pending = new Map<string, Pending>();
    function outdated(res: Response): void {
        res.status(409).send(renderPage("Confirmation needs refreshing - MJScore", `
<h2>Please review this action again</h2>
<p>The game or saved file changed, or this confirmation expired or was already used. No changes were made by this submission.</p>
<p><a href="/">Current game</a> · <a href="/save-game">Save</a> · <a href="/load-game">Load</a> · <a href="/new-game">New Game</a></p>`));
    }
    app.post(endpoint, (req, res) => {
        res.set("Cache-Control", "no-store");
        const token: unknown = req.body?.confirmationToken;
        const item = typeof token === "string" ? pending.get(token) : undefined;
        if (!item || typeof token !== "string" || item.expires <= Date.now()) {
            if (typeof token === "string") pending.delete(token);
            outdated(res);
            return;
        }
        if (req.body?.decision === "cancel") {
            pending.delete(token);
            res.redirect(303, "/");
            return;
        }
        if (req.body?.decision !== "confirm" || getGame() !== item.current) {
            pending.delete(token);
            outdated(res);
            return;
        }
        const action = item.action;
        if (action.kind !== "new") {
            const latest = inspectNamedSave(action.save.name);
            if (!latest || latest.fingerprint !== action.save.fingerprint) {
                pending.delete(token);
                outdated(res);
                return;
            }
        }
        // Keep the confirmation usable on storage failure; delete only on success.
        if (action.kind === "save") saveGameAs(action.replacement, action.save.name);
        else setGame(action.replacement);
        pending.delete(token);
        res.redirect(303, "/");
    });
    return (res: Response, action: Action): void => {
        res.set("Cache-Control", "no-store");
        for (const [key, item] of pending) if (item.expires <= Date.now()) pending.delete(key);
        if (pending.size >= 1000) pending.delete(pending.keys().next().value!);
        const current = getGame();
        const token = randomBytes(32).toString("hex");
        pending.set(token, { action, current, expires: Date.now() + 15 * 60 * 1000 });
        const title = action.kind === "save" ? "Replace existing saved game?" :
            action.kind === "load" ? "Load saved game and replace current game?" : "Start a new game and replace current game?";
        const button = action.kind === "save" ? "Replace saved game" : action.kind === "load" ? "Replace current game and load" : "Replace current game and start";
        const existing = action.kind === "save" ? action.save.game : current;
        const oldLabel = action.kind === "save" ? `Existing save: ${escapeHtml(action.save.name)}` : "Current game";
        const nextLabel = action.kind === "load" ? `Load save: ${escapeHtml(action.save.name)}` : action.kind === "new" ? "New game" : "Replace with current game";
        res.send(renderPage(title + " - MJScore", `
<h2>${title}</h2>
<h3>${oldLabel}</h3>${summary(existing)}
<h3>${nextLabel}</h3>${summary(action.replacement)}
<p>${action.kind === "save" ? "This replaces the named saved copy. Your current game stays unchanged." : "This replaces the active game and its automatic save. Named saved copies stay unchanged. Save your current game under a name first if you want to keep it."}</p>
<form method="POST" action="${escapeHtml(endpoint)}">
<input type="hidden" name="confirmationToken" value="${token}">
<button type="submit" name="decision" value="confirm">${button}</button>
<button type="submit" name="decision" value="cancel">Cancel — keep existing game</button>
</form>`));
    };
}
