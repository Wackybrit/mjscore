import { Wind } from "./wind";

export interface HandPlayerResult {
    /**
     * ID of the player this score belongs to.
     */
    playerId: string;

    /**
     * The raw score for this player's hand
     * before settlements are calculated.
     */
    handScore: number;

    /**
     * True if this player went Mah-Jongg
     * for this hand.
     */
    mahJongg: boolean;
}

export interface HandResult {
    /**
     * Sequential hand number.
     */
    handNumber: number;

    /**
     * Wind of the round when this hand was played.
     */
    roundWind: Wind;

    /**
     * Player who held East Wind during this hand.
     */
    eastPlayerId: string;

    /**
     * Raw scores for all players.
     * The winning hand should have mahJongg: true.
     */
    players: HandPlayerResult[];

    /**
     * Optional notes for corrections or table comments.
     */
    notes?: string;
}