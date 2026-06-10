export interface CoinBreakdown {
    color: string;
    value: number;
    count: number;
}

const COIN_DENOMINATIONS: CoinBreakdown[] = [
    { color: "White", value: 500, count: 0 },
    { color: "Blue", value: 100, count: 0 },
    { color: "Green", value: 50, count: 0 },
    { color: "Yellow", value: 20, count: 0 },
    { color: "Red", value: 2, count: 0 }
];

export function calculateCoinBreakdown(
    amount: number
): CoinBreakdown[] {
    let remainingAmount = amount;

    return COIN_DENOMINATIONS.map(denomination => {
        const count = Math.floor(
            remainingAmount / denomination.value
        );

        remainingAmount -= count * denomination.value;

        return {
            ...denomination,
            count
        };
    }).filter(coin => coin.count > 0);
}