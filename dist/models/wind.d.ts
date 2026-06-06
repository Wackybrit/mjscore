export declare enum Wind {
    East = "East",
    South = "South",
    West = "West",
    North = "North"
}
export declare const WIND_ORDER: Wind[];
/**
 * Returns the next wind in sequence.
 *
 * East -> South -> West -> North -> East
 */
export declare function nextWind(currentWind: Wind): Wind;
//# sourceMappingURL=wind.d.ts.map