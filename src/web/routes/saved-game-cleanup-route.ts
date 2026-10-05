import { Express, Response } from "express";
import { randomBytes } from "node:crypto";
import { inspectSavedGame, listRemovedGames, removeSavedGame, restoreSavedGame } from "../../services/saved-game-cleanup";
import { renderPage } from "../page-template";

export function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

type Confirmation = { action: "remove" | "restore"; target: string; name: string; fingerprint: string; expires: number };

export function registerSavedGameCleanupRoutes(app: Express): void {
    // Random, short-lived, single-use confirmations also prevent forged cross-site POSTs.
    const confirmations = new Map<string, Confirmation>();
    function issue(value: Omit<Confirmation, "expires">): string {
        for (const [key, item] of confirmations) {
            if (item.expires <= Date.now()) confirmations.delete(key);
        }
        if (confirmations.size >= 1000) confirmations.delete(confirmations.keys().next().value!);
        const token = randomBytes(32).toString("hex");
        confirmations.set(token, { ...value, expires: Date.now() + 15 * 60 * 1000 });
        return token;
    }
    function error(res: Response, message: string): void {
        res.status(400).send(renderPage("Saved game unchanged - MJScore", `<h2>Action not completed</h2><p>${escapeHtml(message)}</p><p><a href="/load-game">Back to saved games</a> · <a href="/removed-games">Removed games</a></p>`));
    }
    app.get("/remove-saved-game", (req, res) => {
        try {
            if (typeof req.query.name !== "string") throw new Error("Choose a saved game first.");
            const save = inspectSavedGame(req.query.name);
            const token = issue({ action: "remove", target: save.name, name: save.name, fingerprint: save.fingerprint });
            res.set("Cache-Control", "no-store");
            res.send(renderPage("Confirm removal - MJScore", `
<h2>Remove saved game?</h2>
<dl><dt>Save name</dt><dd><strong>${escapeHtml(save.name)}</strong></dd>
<dt>Players</dt><dd>${escapeHtml(save.players)}</dd>
<dt>Completed hands</dt><dd>${escapeHtml(save.hands)}</dd>
<dt>Last saved (UTC)</dt><dd>${escapeHtml(save.modified)}</dd></dl>
<p>This removes the saved copy from the Load list. Your current game stays unchanged.</p>
<p>You can restore this copy from Removed games. It will not be permanently deleted.</p>
<form method="POST" action="/remove-saved-game">
<input type="hidden" name="token" value="${token}">
<label>Type the save name exactly to confirm: <input name="confirmation" required autocomplete="off" spellcheck="false"></label>
<p><button type="submit">Move to Removed games</button></p></form>
<p><a href="/load-game">Cancel — keep this save</a></p>`));
        } catch {
            error(res, "That save could not be read. It may have moved or is not a valid saved-game file. Nothing was removed.");
        }
    });
    app.get("/removed-games", (_req, res) => {
        try {
            res.set("Cache-Control", "no-store");
            const entries = listRemovedGames();
            res.send(renderPage("Removed games - MJScore", `<h2>Removed games</h2>
<p>These copies stay here until restored. Restoring never replaces an existing save or changes the current game.</p>
${entries.length === 0 ? "<p>No removed games.</p>" : entries.map(entry => {
    const token = issue({ action: "restore", target: entry.id, name: entry.name, fingerprint: "" });
    return `<section><h3>${escapeHtml(entry.name)}</h3><p>Removed (UTC): ${escapeHtml(entry.removedAt)}</p>
<form method="POST" action="/restore-saved-game"><input type="hidden" name="token" value="${token}"><button type="submit">Restore ${escapeHtml(entry.name)}</button></form></section>`;
}).join("")}
<p><a href="/load-game">Back to saved games</a></p>`));
        } catch {
            error(res, "Removed games could not be read. Check the data directory permissions.");
        }
    });
    for (const action of ["remove", "restore"] as const) {
        app.post(`/${action}-saved-game`, (req, res) => {
            const token = req.body?.token;
            const value = typeof token === "string" ? confirmations.get(token) : undefined;
            if (!value || value.action !== action || value.expires <= Date.now()) {
                error(res, "Confirmation expired or was already used. Open the saved-game page and try again.");
                return;
            }
            if (action === "remove" && req.body?.confirmation !== value.name) {
                error(res, "The name did not match exactly. Nothing was removed. Open the confirmation page and try again.");
                return;
            }
            confirmations.delete(token);
            try {
                if (action === "remove") removeSavedGame(value.target, value.fingerprint);
                else restoreSavedGame(value.target);
                res.redirect(303, action === "remove" ? "/removed-games" : "/load-game");
            } catch (err) {
                const code = (err as NodeJS.ErrnoException).code;
                error(res, code === "EEXIST"
                    ? "A saved game already has that name. Both copies were kept; nothing was overwritten."
                    : code ? "The file operation could not finish. Check the saved and removed lists before retrying."
                    : (err as Error).message);
            }
        });
    }
}
