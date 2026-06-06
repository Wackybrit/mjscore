export interface Player {
    /**
     * Unique identifier.
     * Future versions could use UUIDs.
     */
    id: string;
    /**
     * Player display name.
     */
    name: string;
    /**
     * Current game score.
     */
    score: number;
    /**
     * Fixed physical seat position.
     *
     * 0 = Seat 1
     * 1 = Seat 2
     * 2 = Seat 3
     * 3 = Seat 4
     */
    seatPosition: number;
}
//# sourceMappingURL=player.d.ts.map