import { Player } from "./player";
import { HandResult } from "./hand-result";
import { Wind } from "./wind";
export interface Game {
    /**
     * The four players participating.
     */
    players: Player[];
    /**
     * Index of the player currently holding East Wind.
     *
     * Example:
     * 0 = players[0] is East
     * 1 = players[1] is East
     */
    eastPlayerIndex: number;
    /**
     * Wind of the current round.
     *
     * East Round
     * South Round
     * West Round
     * North Round
     */
    roundWind: Wind;
    /**
     * Which complete rotation of East holders
     * has been completed.
     *
     * Example:
     * 1 = first cycle
     * 2 = second cycle
     */
    roundNumber: number;
    /**
     * Sequential hand number.
     */
    handNumber: number;
    /**
     * History of completed hands.
     */
    hands: HandResult[];
}
//# sourceMappingURL=game.d.ts.map