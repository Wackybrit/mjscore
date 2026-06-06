import { Player } from "./player";
import { HandResult } from "./hand-result";
import { Wind } from "./wind";

export interface Game {
    players: Player[];

    eastPlayerIndex: number;

    startingEastPlayerIndex: number;

    eastAdvancementsThisRound: number;

    roundWind: Wind;

    roundNumber: number;

    handNumber: number;

    hands: HandResult[];
}