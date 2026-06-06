"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WIND_ORDER = exports.Wind = void 0;
exports.nextWind = nextWind;
var Wind;
(function (Wind) {
    Wind["East"] = "East";
    Wind["South"] = "South";
    Wind["West"] = "West";
    Wind["North"] = "North";
})(Wind || (exports.Wind = Wind = {}));
exports.WIND_ORDER = [
    Wind.East,
    Wind.South,
    Wind.West,
    Wind.North
];
/**
 * Returns the next wind in sequence.
 *
 * East -> South -> West -> North -> East
 */
function nextWind(currentWind) {
    const currentIndex = exports.WIND_ORDER.indexOf(currentWind);
    return exports.WIND_ORDER[(currentIndex + 1) % exports.WIND_ORDER.length];
}
//# sourceMappingURL=wind.js.map