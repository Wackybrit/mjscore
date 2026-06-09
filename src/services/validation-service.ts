import { Wind } from "../models/wind";

export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

export function validateHandScores(
    scores: number[]
): ValidationResult {
    const errors: string[] = [];

    scores.forEach((score, index) => {
        if (!Number.isFinite(score)) {
            errors.push(`Player ${index + 1} score must be a number.`);
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

    if (uniqueWinds.size !== 4) {
        errors.push("Each player must have a unique starting wind.");
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

export function validateMahJonggWinner(
    winnerId: string | undefined
): ValidationResult {
    const errors: string[] = [];

    if (!winnerId) {
        errors.push("A Mah-Jongg winner must be selected.");
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