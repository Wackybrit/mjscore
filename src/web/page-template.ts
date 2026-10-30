import { clubTableStyles } from "./club-table-styles";

export function renderPage(title: string, body: string, gameOver: boolean = false): string {
    const active = title.includes("Settings") ? "/settings" : title.includes("History") || title.startsWith("Hand ") ? "/history" : title.includes("Score Hand") ? "/score-hand" : title.includes("Players") ? "/edit-players" : title.includes("Load") ? "/load-game" : title.includes("Save Game") ? "/save-game" : title.includes("New Game") ? "/new-game" : "/";
    const links = [["/", "Current Game"], [gameOver ? "/game-over" : "/score-hand", gameOver ? "Game Over" : "Score Hand"], ["/history", "History"], ["/edit-players", "Players"], ["/save-game", "Save"], ["/load-game", "Load"], ["/new-game", "New Game"], ["/settings", "Settings"]];
    return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title}</title><style>${clubTableStyles}</style></head>
<body><header><div class="brand-row"><h1><a href="/">MJScore</a><span class="brand-tag">AT THE TABLE</span></h1><span class="brand-description">British Mah-Jongg</span></div></header>
<nav aria-label="Application">${links.map(([href, label]) => `<a href="${href}"${href === active ? ' aria-current="page"' : ""}>${label}</a>`).join("")}</nav>
<main${gameOver ? ' class="completed-game"' : ""}>${body}</main></body></html>`;
}
