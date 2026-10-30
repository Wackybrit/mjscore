import { loadSettings } from "../../services/settings-service";
import { isGameOver } from "../../services/game-service";
import { escapeHtml } from "../html-utils";
import { Express } from "express";

import { getPlayerName } from "../../models/game-utils";
import { Game } from "../../models/game";
import { getRackColorCss } from "../../models/rack-color";
import {
    calculateNetResults,
    calculateSettlements,
    getMahJonggPlayer
} from "../../services/scoring-service";
import { renderPage } from "../page-template";
import {calculateCoinBreakdown} from "../../services/coin-service";

function renderCoins(
    amount: number
): string {
    const coins = calculateCoinBreakdown(amount);

    return coins
        .map(coin => `
            <span class="coin coin-${coin.color.toLowerCase()}">
                ${coin.count}
            </span>
        `)
        .join("");
}

export function registerHandDetailRoute(
    app: Express,
    getGame: () => Game
): void {
    app.get("/hand/:handNumber", (req, res) => {
        const game = getGame();
        const { showCoinSettlements } = loadSettings();
        res.set("Cache-Control", "no-store");

        const handNumber = Number(
            req.params.handNumber
        );

        const hand = game.hands.find(
            savedHand => savedHand.handNumber === handNumber
        );

        if (!hand) {
            res.send(
                renderPage(
                    "Hand Not Found - MJScore",
                    `
<h2>Hand Not Found</h2>

<p>Could not find hand number ${handNumber}.</p>

<div class="actions">
    <a href="/history"><button>Back to History</button></a>
    <a href="/"><button>Current Game</button></a>
</div>
`
                )
            );

            return;
        }

        const winner = hand.deadHand ? null : getMahJonggPlayer(hand.players);
        const settlements = calculateSettlements(hand);
        const netResults = hand.deadHand
            ? game.players.map(player => ({ playerId: player.id, amount: 0 }))
            : calculateNetResults(settlements);
        const runningTotals = new Map<string, number>();
        const lastHand = game.hands.at(-1);
        const canEditHand = lastHand?.handNumber === hand.handNumber;

        game.players.forEach(player => {
            runningTotals.set(player.id, 0);
        });

        for (const historicalHand of game.hands) {
            const historicalSettlements =
                calculateSettlements(historicalHand);

            const historicalNetResults =
                calculateNetResults(historicalSettlements);

            historicalNetResults.forEach(result => {
                const currentTotal =
                    runningTotals.get(result.playerId) ?? 0;

                runningTotals.set(
                    result.playerId,
                    currentTotal + result.amount
                );
            });

            if (
                historicalHand.handNumber === hand.handNumber
            ) {
                break;
            }
        }

        const eastPlayerName = getPlayerName(
            game,
            hand.eastPlayerId
        );

        const scoreRows = game.players
            .map(player => {
                const result = hand.players.find(
                    handPlayer => handPlayer.playerId === player.id
                );

                if (!result) {
                    return "";
                }

                const isWinner = result.mahJongg;

                const playerStyle = `
                    background-color: ${getRackColorCss(player.rackColor)};
                    ${isWinner ? "font-weight: bold;" : ""}
                `;

                const scoreStyle = isWinner
                    ? ` style="font-weight: bold;"`
                    : "";

                return `
        <tr>
            <td style="${playerStyle}">
                ${escapeHtml(player.name)}
            </td>
            <td${scoreStyle} class="hand-value">${result.handScore}${hand.maxHandScore !== undefined && result.handScore > hand.maxHandScore ? `<span class="payment-note">settles as ${hand.maxHandScore}</span>` : ""}</td>
        </tr>
        `;
            })
            .join("");

        const totalRows = game.players
            .map(player => {
                const total =
                    runningTotals.get(player.id) ?? 0;

                const sign =
                    total > 0
                        ? "+"
                        : "";

                return `
        <tr>
            <td
                style="
                    background-color:
                    ${getRackColorCss(player.rackColor)};
                "
            >
                ${escapeHtml(player.name)}
            </td>
            <td>${sign}${total}</td>
        </tr>
        `;
            })
            .join("");

        const getPlayerSortOrder = (
            playerId: string
        ): number => {
            return game.players.findIndex(
                player => player.id === playerId
            );
        };

        const sortedSettlements = [...settlements].sort((a, b) => {
            const fromCompare =
                getPlayerSortOrder(a.fromPlayerId) -
                getPlayerSortOrder(b.fromPlayerId);

            if (fromCompare !== 0) {
                return fromCompare;
            }

            return (
                getPlayerSortOrder(a.toPlayerId) -
                getPlayerSortOrder(b.toPlayerId)
            );
        });

            const paymentRows = sortedSettlements
            .map(settlement => {
                const fromPlayer = game.players.find(
                    player => player.id === settlement.fromPlayerId
                );

                const toPlayer = game.players.find(
                    player => player.id === settlement.toPlayerId
                );

                if (!fromPlayer || !toPlayer) {
                    return "";
                }

                return `
<tr>
    <td style="background-color: ${getRackColorCss(fromPlayer.rackColor)};">
        ${escapeHtml(fromPlayer.name)}
    </td>
    <td>pays</td>
    <td style="background-color: ${getRackColorCss(toPlayer.rackColor)};">
        ${escapeHtml(toPlayer.name)}
    </td>
    <td>${settlement.amount}</td>
    <td>${renderCoins(settlement.amount)}</td>
    <td>${settlement.reason}</td>
</tr>
`;
            })
            .join("");

        const netRows = [...netResults]
            .sort((a,b) => b.amount - a.amount)
            .map(result => {
                const player = game.players.find(
                    currentPlayer => currentPlayer.id === result.playerId
                );

                if (!player) {
                    return "";
                }

                const sign =
                    result.amount > 0
                        ? "+"
                        : "";

                return `
<tr>
    <td style="background-color: ${getRackColorCss(player.rackColor)};">
        ${escapeHtml(player.name)}
    </td>
    <td>${sign}${result.amount}</td>
</tr>
`;
            })
            .join("");

        res.send(
            renderPage(
                `Hand ${hand.handNumber} - MJScore`,
                `
<h2>Hand ${hand.handNumber}${hand.deadHand ? " — Dead Hand" : ""}</h2>
${!hand.deadHand && hand.maxHandScore !== undefined ? `<p class="muted">Raw scores are shown below. Payment limit: ${hand.maxHandScore} per player, before East’s doubling.</p>` : ""}
${hand.deadHand ? '<p class="replay-notice">No scores or payments. Winds stay in place. East passes after the next completed hand, even if East wins.</p>' : game.hands[game.hands.indexOf(hand) - 1]?.deadHand ? '<p class="replay-notice">Replay completed: normal payments apply, and East passes even if East won.</p>' : ""}

<div class="card hand-summary">
    <table class="status-table">
        <tr>
            <td>
                <strong>Round Wind:</strong>
                ${hand.roundWind}
            </td>

            <td>
                <strong>East Wind:</strong>
                <span
                    style="
                        background-color: ${getRackColorCss(
                            game.players.find(
                                player => player.id === hand.eastPlayerId
                            )?.rackColor ?? game.players[0]!.rackColor
                        )};
                        padding: 0.15rem 0.5rem;
                        border-radius: 4px;
                    "
                >
                    ${escapeHtml(eastPlayerName)}
                </span>
            </td>

            <td>
                <strong>Mah-Jongg:</strong>
                <span
                    style="
                        background-color: ${winner ? getRackColorCss(
                            game.players.find(
                                player => player.id === winner.playerId
                            )?.rackColor ?? game.players[0]!.rackColor
                        ) : "transparent"};
                        padding: 0.15rem 0.5rem;
                        border-radius: 4px;
                    "
                >
                    ${winner ? escapeHtml(getPlayerName(game, winner.playerId)) : "None — Dead Hand"}
                </span>
            </td>
        </tr>
    </table>
</div>

<div class="three-column-section">
    <div>
        <h3>Hand Scores</h3>

        <table>
            <thead>
                <tr>
                    <th>Player</th>
                    <th>Score</th>
                </tr>
            </thead>

            <tbody>
                ${scoreRows}
            </tbody>
        </table>
    </div>

    <div>
        <h3>Hand Results</h3>

        <table>
            <thead>
                <tr>
                    <th>Player</th>
                    <th>Change</th>
                </tr>
            </thead>

            <tbody>
                ${netRows}
            </tbody>
        </table>
    </div>

    <div>
        <h3>Current Totals</h3>

        <table>
            <thead>
                <tr>
                    <th>Player</th>
                    <th>Total</th>
                </tr>
            </thead>

            <tbody>
                ${totalRows}
            </tbody>
        </table>
    </div>
</div>

${showCoinSettlements ? `
<section class="coin-settlements" aria-label="Coin settlements">
<h3>Payments</h3>

<table>
    <thead>
        <tr>
            <th>From</th>
            <th></th>
            <th>To</th>
            <th>Amount</th>
            <th>Coins</th>
            <th>Reason</th>
        </tr>
    </thead>

    <tbody>
        ${paymentRows || '<tr><td colspan="6">No payments — Dead Hand.</td></tr>'}
    </tbody>
</table>
</section>` : ""}

<div class="actions hand-actions">
    <a href="${isGameOver(game) ? "/game-over" : "/"}" class="button button-primary">${isGameOver(game) ? "Game Over" : "Next Hand"}</a>
    ${canEditHand ? '<a href="/edit-last-hand" class="button">Edit Last Hand</a>' : ""}
</div>

`,
                isGameOver(game)
            )
        );
    });
}