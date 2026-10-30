import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

// Complete and flush the replacement before renaming it over the existing file.
export function writeJsonAtomically(filePath: string, value: unknown): void {
    const contents = JSON.stringify(value, null, 4);
    const temporary = path.join(path.dirname(filePath), `.mjscore-${randomUUID()}.tmp`);
    let descriptor: number | undefined;
    let created = false;
    try {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        const mode = fs.existsSync(filePath) ? fs.statSync(filePath).mode & 0o777 : 0o666;
        descriptor = fs.openSync(temporary, "wx", mode);
        created = true;
        fs.writeFileSync(descriptor, contents, "utf8");
        fs.fsyncSync(descriptor);
        fs.closeSync(descriptor);
        descriptor = undefined;
        fs.renameSync(temporary, filePath);
    } finally {
        if (descriptor !== undefined) {
            try { fs.closeSync(descriptor); } catch { /* Keep the original error. */ }
        }
        if (created) {
            try { fs.unlinkSync(temporary); } catch { /* A successful rename removes the temporary path. */ }
        }
    }
}
