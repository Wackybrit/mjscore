import { Game } from "../models/game";
import { Wind, WIND_ORDER } from "../models/wind";
import { RackColor } from "../models/rack-color";
import { escapeHtml } from "./html-utils";

export function rackAccent(color: RackColor): string {
    return { Red: "#c3544f", Blue: "#3b78ac", Green: "#43875e", Yellow: "#b49327" }[color];
}
export function roundHeading(game: Game, title: string): string {
    const glyph = { East: "🀀", South: "🀁", West: "🀂", North: "🀃" }[game.roundWind];
    return `<div class="page-heading"><div><p class="eyebrow"><strong>Hand Number:</strong> ${game.handNumber} · ${game.roundNumber <= 4 ? "First" : "Second"} circuit</p><h2>${title}</h2></div><div class="round-summary"><span class="round-glyph" aria-hidden="true">${glyph}</span><div><strong>${game.roundWind} round</strong><small>East: ${escapeHtml(game.players[game.eastPlayerIndex]?.name ?? "Unknown")}</small></div></div></div>`;
}
export function roundProgress(game: Game): string {
    return `<ol class="round-progress" aria-label="Round progression">${[...WIND_ORDER, ...WIND_ORDER].map((wind: Wind, index) => `<li${index + 1 === game.roundNumber ? ' aria-current="step"' : index + 1 < game.roundNumber ? ' class="completed"' : ""} aria-label="${index < 4 ? "First" : "Second"} ${wind} round">${wind}</li>`).join("")}</ol>`;
}
