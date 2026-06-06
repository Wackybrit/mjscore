export interface PlayerScoreChange {
    playerId: string;
    /**
     * Positive or negative score adjustment
     * resulting from this hand.
     */
    scoreChange: number;
}
export interface HandResult {
    /**
     * Sequential hand number.
     */
    handNumber: number;
    /**
     * Player who achieved Mah-Jongg.
     */
    winnerId: string;
    /**
     * Player who held East Wind
     * during this hand.
     */
    eastPlayerId: string;
    /**
     * Individual score changes
     * resulting from the hand.
     */
    playerScores: PlayerScoreChange[];
    /**
     * Optional notes for future use.
     */
    notes?: string;
}
//# sourceMappingURL=hand-result.d.ts.map