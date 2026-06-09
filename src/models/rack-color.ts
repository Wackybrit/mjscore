export enum RackColor {
    Red = "Red",
    Blue = "Blue",
    Green = "Green",
    Yellow = "Yellow"
}

export const RACK_COLOR_ORDER: RackColor[] = [
    RackColor.Red,
    RackColor.Blue,
    RackColor.Green,
    RackColor.Yellow
];

export function getRackColorCss(
    rackColor: RackColor
): string {
    switch (rackColor) {
        case RackColor.Red:
            return "rgba(255, 0, 0, 0.30)";

        case RackColor.Blue:
            return "rgba(0, 102, 255, 0.30)";

        case RackColor.Green:
            return "rgba(0, 160, 80, 0.30)";

        case RackColor.Yellow:
            return "rgba(255, 220, 0, 0.35)";
    }
}