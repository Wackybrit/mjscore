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
            return "#ed6b62";

        case RackColor.Blue:
            return "#63a8e2";

        case RackColor.Green:
            return "#67bd83";

        case RackColor.Yellow:
            return "#f5d547";
    }
}