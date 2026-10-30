import { createHmac, randomBytes } from "node:crypto";
import { Express } from "express";
import { loadSettings, saveSettings } from "../../services/settings-service";
import { renderPage } from "../page-template";

export function registerSettingsRoute(app: Express): void {
    const secret = randomBytes(32);
    const token = (): string => createHmac("sha256", secret).update(JSON.stringify(loadSettings())).digest("hex");
    app.get("/settings", (_req, res) => {
        const settings = loadSettings();
        res.set("Cache-Control", "no-store");
        res.send(renderPage("Settings - MJScore", `
<div class="page-heading"><div><p class="eyebrow">MAKE IT YOUR TABLE</p><h2>Settings</h2></div></div>
<form method="POST" action="/settings" class="settings-form">
<input type="hidden" name="settingsToken" value="${token()}">
<section class="settings-section"><h3>Coin settlements</h3>
<label class="toggle-label"><input type="checkbox" name="showCoinSettlements" value="on" ${settings.showCoinSettlements ? "checked" : ""}> Show coin settlements</label>
<p class="muted">Show payments and coin breakdowns after each hand. Turn off when the app alone keeps score; player changes and totals stay visible.</p></section>
<section class="settings-section"><h3>Maximum hand score</h3>
<label for="max-hand-score">Payment limit per player</label>
<input id="max-hand-score" type="number" name="maxHandScore" value="${settings.maxHandScore}" min="22" step="2" required inputmode="numeric">
<p class="muted">Store full scores in history. Payments use this cap for every player, before East’s doubling.</p>
<p class="muted">New hands use the saved limit. Earlier hands and corrections keep their original payment rules.</p></section>
<div class="actions"><button class="button-primary" type="submit">Save Settings</button><a href="/" class="button">Cancel</a></div>
</form>`));
    });
    app.post("/settings", (req, res) => {
        res.set("Cache-Control", "no-store");
        if (typeof req.body?.settingsToken !== "string" || req.body.settingsToken !== token()) {
            res.status(409).send(renderPage("Settings need refreshing - MJScore", '<h2>Settings need refreshing</h2><p>Settings changed or MJScore restarted. No changes were made.</p><a href="/settings" class="button">Open Settings</a>'));
            return;
        }
        saveSettings({ showCoinSettlements: req.body.showCoinSettlements === "on", maxHandScore: typeof req.body.maxHandScore === "string" && req.body.maxHandScore.trim() !== "" ? Number(req.body.maxHandScore) : NaN });
        res.redirect(303, "/settings");
    });
}
