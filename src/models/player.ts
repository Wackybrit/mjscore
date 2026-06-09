import { RackColor } from "./rack-color";

export interface Player {
    id: string;
    name: string;
    score: number;
    seatPosition: number;
    rackColor: RackColor;
}