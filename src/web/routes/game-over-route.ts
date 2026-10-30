import { Express } from "express";
import { Game } from "../../models/game";
import { getRackColorCss } from "../../models/rack-color";
import { isGameOver } from "../../services/game-service";
import { escapeHtml } from "../html-utils";
import { renderPage } from "../page-template";

export function renderGameOverPage(game: Game): string {
    const players = [...game.players].sort((a, b) => b.score - a.score);
    const topScore = players[0]!.score;
    const winners = players.filter(player => player.score === topScore);
    const names = winners.map(player => escapeHtml(player.name));
    const winnerText = winners.length === 1 ? `${names[0]} wins!` : "Joint winners";
    const points = `${topScore > 0 ? "+" : ""}${topScore}`;
    let rank = 0;
    const rows = players.map((player, index) => {
        if (index === 0 || player.score !== players[index - 1]!.score) rank = index + 1;
        return `<tr class="${player.score === topScore ? "winning-row" : ""}">
<td>${rank}</td>
<td class="final-player"><span class="rack-marker" style="background:${getRackColorCss(player.rackColor)}"></span>${escapeHtml(player.name)}</td>
<td class="final-score">${player.score > 0 ? "+" : ""}${player.score}</td></tr>`;
    }).join("");
    return renderPage("Final scores - MJScore", `
<style>
.results-screen { max-width: 1050px; margin: 1.25rem auto; }
.winner-banner { position: relative; text-align: center; padding: 1.6rem 2rem; border-radius: 16px; border: 3px solid #d9b45a; color: #fff9e7; background: linear-gradient(125deg, #123c32, #205747); box-shadow: 0 6px 18px #0002; }
.result-kicker { margin: 0 0 .4rem; font-size: .85rem; font-weight: bold; letter-spacing: .14em; color: #f3d88b; }
.result-trophy { font-size: 2.8rem; line-height: 1.2; }
.winner-banner h2 { margin: .3rem 0; font-size: clamp(2rem, 4vw, 3rem); overflow-wrap: anywhere; }
.joint-winner-names { margin: .4rem 0; font-size: 1.65rem; font-weight: bold; overflow-wrap: anywhere; }
.winner-points { margin: .5rem 0 0; color: #f3d88b; font-size: 1.35rem; }
.final-heading { margin: 1.25rem 0 .6rem; }
.final-scores { width: 100%; font-size: 1.2rem; }
.final-scores th, .final-scores td { padding: .65rem 1rem; }
.final-scores th { background: #e7ece8; }
.final-scores .final-player { text-align: left; overflow-wrap: anywhere; }
.final-scores .final-score { font-size: 1.4rem; font-weight: bold; font-variant-numeric: tabular-nums; }
.winning-row { background: #fff4d3; }
.rack-marker { display: inline-block; width: .8rem; height: .8rem; border-radius: 50%; margin-right: .65rem; border: 1px solid #777; }
.result-actions { display: flex; flex-wrap: wrap; gap: 1rem; margin-top: 1rem; }
.result-actions a { color: #123c32; font-weight: bold; padding: .6rem .85rem; background: white; border: 1px solid #bccac1; border-radius: 6px; text-decoration: none; }
</style>
<section class="results-screen">
<div class="winner-banner" aria-label="Game winner">
<p class="result-kicker">GAME OVER · EIGHT ROUNDS COMPLETE</p>
<div class="result-trophy" aria-hidden="true">🏆</div>
<h2>${winnerText}</h2>
${winners.length > 1 ? `<p class="joint-winner-names">${names.join(" &amp; ")}</p>` : ""}
<p class="winner-points">${points} points${winners.length > 1 ? " each" : ""}</p>
</div>
<h2 class="final-heading">Final player scores</h2>
<table class="final-scores" aria-label="Final player scores">
<thead><tr><th scope="col">Place</th><th scope="col">Player</th><th scope="col">Final score</th></tr></thead>
<tbody>${rows}</tbody></table>
<div class="result-actions"><a href="/history">View history</a><a href="/save-game">Save game</a><a href="/edit-last-hand">Edit Last Hand</a><a href="/new-game">New Game</a></div>
</section>`, true);
}

export function registerGameOverRoute(app: Express, getGame: () => Game): void {
    app.get("/game-over", (_req, res) => {
        const game = getGame();
        res.set("Cache-Control", "no-store");
        if (!isGameOver(game)) {
            res.redirect(303, "/");
            return;
        }
        res.send(renderGameOverPage(game));
    });
}
