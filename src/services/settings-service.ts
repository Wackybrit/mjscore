import fs from "node:fs";
import path from "node:path";
import { writeJsonAtomically } from "./atomic-file-service";
import { PersistenceError } from "./persistence-service";

export interface Settings {
    showCoinSettlements: boolean;
    maxHandScore: number;
}
export const DEFAULT_SETTINGS: Readonly<Settings> = Object.freeze({ showCoinSettlements: true, maxHandScore: 500 });
const settingsPath = path.join(process.cwd(), "data", "settings.json");
export function isValidHandLimit(value: unknown): value is number {
    return typeof value === "number" && Number.isSafeInteger(value) && value >= 22 && value % 2 === 0;
}
function validate(value: unknown): asserts value is Settings {
    if (!value || typeof value !== "object" || Array.isArray(value) ||
        typeof (value as Settings).showCoinSettlements !== "boolean" || !isValidHandLimit((value as Settings).maxHandScore)) {
        throw new PersistenceError("Settings must include a coin-settlement preference and an even maximum hand score of at least 22.", 400);
    }
}
export function loadSettings(): Settings {
    let contents: string;
    try { contents = fs.readFileSync(settingsPath, "utf8"); }
    catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return { ...DEFAULT_SETTINGS };
        throw new PersistenceError("Settings could not be read. Check the data folder permissions. The settings file was kept.");
    }
    try { const settings: unknown = JSON.parse(contents); validate(settings); return settings; }
    catch { throw new PersistenceError("The settings file is damaged or incompatible. Restore data/settings.json from a backup; it has been left unchanged."); }
}
export function saveSettings(settings: Settings): void {
    validate(settings);
    try { writeJsonAtomically(settingsPath, settings); }
    catch { throw new PersistenceError("Settings could not be saved. Previous settings were kept. Check storage and permissions, then try again."); }
}
