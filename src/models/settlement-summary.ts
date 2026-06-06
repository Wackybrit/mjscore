import { Settlement } from "./settlement";

export interface PlayerNetResult {
    playerId: string;
    amount: number;
}

export interface SettlementSummary {
    settlements: Settlement[];
    netResults: PlayerNetResult[];
}