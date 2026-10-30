import { randomBytes } from "node:crypto";
import { Response } from "express";
import { Game } from "../models/game";
import { renderPage } from "./page-template";
import { escapeHtml } from "./html-utils";

// Each route owns its guard. Tokens belong to an exact in-memory game snapshot,
// so even loading an identical save or making a no-op correction invalidates them.
// Weak keys let obsolete snapshots be collected without expiring long-lived forms.
export function createGameFormGuard(formPath: string, formLabel: string) {
    const tokens = new WeakMap<Game, string>();
    return {
        tokenFor(game: Game): string {
            let token = tokens.get(game);
            if (!token) {
                token = randomBytes(32).toString("hex");
                tokens.set(game, token);
            }
            return token;
        },
        accept(game: Game, token: unknown, res: Response): boolean {
            res.set("Cache-Control", "no-store");
            if (typeof token === "string" && tokens.get(game) === token) return true;
            res.status(409).send(renderPage("Form needs refreshing - MJScore", `
<h2>This form needs refreshing</h2>
<p>The game has changed, this form was already submitted, or MJScore has restarted. No changes were made by this submission.</p>
<p>Check the current game before entering the hand again.</p>
<p><a href="/">Current game</a> · <a href="${escapeHtml(formPath)}">${escapeHtml(formLabel)}</a></p>`));
            return false;
        }
    };
}
