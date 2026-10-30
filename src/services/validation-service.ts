import { Wind } from "../models/wind";
import { RackColor } from "../models/rack-color";

export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

export function validateHandScores(
    scores: number[]
): ValidationResult {
    const errors: string[] = [];

    scores.forEach((score, index) => {
        if (!Number.isSafeInteger(score)) {
            errors.push(`Player ${index + 1} score must be a safe whole number.`);
        }

        if (score < 0) {
            errors.push(`Player ${index + 1} score cannot be negative.`);
        }

        if (score % 2 !== 0) {
            errors.push(`Player ${index + 1} score must be even.`);
        }
    });

    return {
        valid: errors.length === 0,
        errors
    };
}

export function validatePlayerNames(
    playerNames: string[]
): ValidationResult {
    const errors: string[] = [];

    const trimmedNames = playerNames.map(name => name.trim());

    trimmedNames.forEach((name, index) => {
        if (name.length === 0) {
            errors.push(`Player ${index + 1} name cannot be blank.`);
        }
    });

    const duplicateNames = trimmedNames.filter(
        (name, index) =>
            name.length > 0 &&
            trimmedNames.findIndex(
                otherName =>
                    otherName.toLowerCase() === name.toLowerCase()
            ) !== index
    );

    if (duplicateNames.length > 0) {
        errors.push("Player names must be unique.");
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

export function validateStartingWinds(
    winds: Wind[]
): ValidationResult {
    const errors: string[] = [];

    const uniqueWinds = new Set(winds);

    if (winds.length !== 4 || winds.some(wind => !Object.values(Wind).includes(wind))) {
        errors.push("Select a valid starting wind for each player.");
    }

    if (uniqueWinds.size !== 4) {
        errors.push("Each player must have a unique starting wind.");
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

export function validateMahJonggWinner(
    winnerId: string | undefined,
    playerIds: string[]
): ValidationResult {
    const errors: string[] = [];

    if (typeof winnerId !== "string" || !playerIds.includes(winnerId)) {
        errors.push("Select a Mah-Jongg winner from the current players.");
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

export function combineValidationResults(
    ...results: ValidationResult[]
): ValidationResult {
    const errors = results.flatMap(result => result.errors);

    return {
        valid: errors.length === 0,
        errors
    };
}

export function validateRackColors(
    rackColors: RackColor[]
): ValidationResult {
    const errors: string[] = [];

    const uniqueColors = new Set(rackColors);

    if (rackColors.length !== 4 || rackColors.some(color => !Object.values(RackColor).includes(color))) {
        errors.push("Select a valid rack color for each player.");
    }

    if (uniqueColors.size !== 4) {
        errors.push("Each player must have a unique rack color.");
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

export function validateMahJonggScore(
    scores: number[],
    winnerId: string | undefined,
    playerIds: string[]
): ValidationResult {
    const errors: string[] = [];

    if (!winnerId) {
        return {
            valid: true,
            errors
        };
    }

    const winnerIndex = playerIds.findIndex(
        id => id === winnerId
    );

    if (
        winnerIndex >= 0 &&
        scores[winnerIndex]! < 22
    ) {
        errors.push(
            "A Mah-Jongg hand must score at least 22 points."
        );
    }

    return {
        valid: errors.length === 0,
        errors
    };
}