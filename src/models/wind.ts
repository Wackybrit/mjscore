export enum Wind {
    East = "East",
    South = "South",
    West = "West",
    North = "North"
}

export const WIND_ORDER: Wind[] = [
    Wind.East,
    Wind.South,
    Wind.West,
    Wind.North
];

/**
 * Returns the next wind in sequence.
 *
 * East -> South -> West -> North -> East
 */
export function nextWind(currentWind: Wind): Wind {
    const currentIndex = WIND_ORDER.indexOf(currentWind);

    return WIND_ORDER[
        (currentIndex + 1) % WIND_ORDER.length
    ]!;
}