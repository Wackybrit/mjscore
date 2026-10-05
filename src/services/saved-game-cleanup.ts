import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";

const saves = path.join(process.cwd(), "data", "saved-games");
const removed = path.join(process.cwd(), "data", "removed-games");
const validName = /^[a-z0-9_-]+$/;
const validId = /^\d+_[0-9a-f-]{36}_[a-z0-9_-]+$/;

function directoryIsSafe(directory: string): void {
    if (!fs.lstatSync(directory).isDirectory()) {
        throw new Error("The saved-game directory is not a regular directory.");
    }
}

function savedPath(name: string): string {
    if (!validName.test(name)) throw new Error("Invalid saved-game name.");
    directoryIsSafe(saves);
    return path.join(saves, `${name}.json`);
}

function regularFile(file: string): Buffer {
    if (!fs.lstatSync(file).isFile()) throw new Error("Not a regular saved-game file.");
    return fs.readFileSync(file);
}

export function inspectSavedGame(name: string) {
    const file = savedPath(name);
    const bytes = regularFile(file);
    let players = "Unavailable";
    let hands = "Unavailable";
    try {
        const game = JSON.parse(bytes.toString("utf8"));
        if (Array.isArray(game.players)) {
            players = game.players.map((p: { name?: unknown }) => String(p?.name ?? "Unknown")).join(", ");
        }
        if (Array.isArray(game.hands)) hands = String(game.hands.length);
    } catch {
        // A damaged save may still be moved aside and later restored unchanged.
    }
    return {
        name, players, hands,
        modified: fs.statSync(file).mtime.toISOString(),
        fingerprint: createHash("sha256").update(bytes).digest("hex")
    };
}

export function removeSavedGame(name: string, expectedFingerprint: string): void {
    const current = inspectSavedGame(name);
    if (current.fingerprint !== expectedFingerprint) {
        throw new Error("This save changed after you opened the confirmation page. Review it again before removing it.");
    }
    fs.mkdirSync(removed, { recursive: true });
    directoryIsSafe(removed);
    const id = `${Date.now()}_${randomUUID()}_${name}`;
    // Move the original bytes on the same persistent volume; never touch current-game.json.
    fs.renameSync(savedPath(name), path.join(removed, `${id}.json`));
}

export function listRemovedGames(): { id: string; name: string; removedAt: string }[] {
    if (!fs.existsSync(removed)) return [];
    directoryIsSafe(removed);
    return fs.readdirSync(removed)
        .filter(file => file.endsWith(".json") && validId.test(file.slice(0, -5)))
        .filter(file => fs.lstatSync(path.join(removed, file)).isFile())
        .map(file => {
            const id = file.slice(0, -5);
            const first = id.indexOf("_");
            return { id, name: id.slice(first + 38), removedAt: new Date(Number(id.slice(0, first))).toISOString() };
        })
        .sort((a, b) => b.id.localeCompare(a.id));
}

export function restoreSavedGame(id: string): void {
    if (!validId.test(id)) throw new Error("Invalid removed-game identifier.");
    directoryIsSafe(removed);
    const entry = listRemovedGames().find(item => item.id === id);
    if (!entry) throw new Error("That removed game is no longer available.");
    fs.mkdirSync(saves, { recursive: true });
    const bytes = regularFile(path.join(removed, `${id}.json`));
    // Exclusive creation prevents overwriting a newer save with the same name.
    fs.writeFileSync(savedPath(entry.name), bytes, { flag: "wx" });
    fs.unlinkSync(path.join(removed, `${id}.json`));
}
