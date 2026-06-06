export interface Settlement {
    /**
     * Player who pays.
     */
    fromPlayerId: string;

    /**
     * Player who receives payment.
     */
    toPlayerId: string;

    /**
     * Amount paid.
     */
    amount: number;

    /**
     * Human-readable explanation.
     *
     * Examples:
     * - "Mah-Jongg payment"
     * - "Hand comparison"
     */
    reason: string;
}