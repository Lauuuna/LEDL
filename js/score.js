/**
 * Numbers of decimal digits to round to
 */
const scale = 1;

/**
 * Fallback / default scoring parameters.
 * B1 is calibrated once (top level of phase 1 ≈ 1000 points) and is NOT
 * recalculated when new (higher) phases are added.
 */
export const SCORING_DEFAULTS = {
    B1: 714.3,
    g: 1.6,
    s: 0.4,
    d: 0.9,
};

/**
 * Merge the provided scoring config with defaults and validate it.
 * Rejects configs where g <= 1 + s, since that would let a lower phase
 * outscore a higher one.
 */
export function normalizeScoring(cfg = {}) {
    const scoring = { ...SCORING_DEFAULTS, ...cfg };
    if (!(scoring.g > 1 + scoring.s)) {
        throw new Error(
            `Invalid scoring config: g (${scoring.g}) must be greater than 1 + s (${1 + scoring.s}).`,
        );
    }
    return scoring;
}

/**
 * Base points of a phase.
 */
export function baseOf(phase, B1, g) {
    return B1 * Math.pow(g, phase - 1);
}

/**
 * Score of a completed level.
 * @param {Object} level Level with { phase, positionInPhase: i, phaseSize: n }
 * @param {Object} scoring Scoring parameters { B1, g, s }
 * @returns {Number}
 */
export function levelScore(level, scoring) {
    const { B1, g, s } = scoring;
    const { phase, positionInPhase: i, phaseSize: n } = level;
    const spread = n > 1 ? (n - i) / (n - 1) : 1;
    return round(baseOf(phase, B1, g) * (1 + s * spread));
}

/**
 * Score of a partial record, as a share of the level's full-clear score.
 * @param {Number} baseScore Full-clear score of the level
 * @param {Number} percent Percentage of completion
 * @param {Number} minPercent Minimum percentage required
 * @returns {Number}
 */
export function percentPointsScore(baseScore, percent, minPercent) {
    if (percent === 100) {
        return round(baseScore);
    }

    const factor = (percent - (minPercent - 1)) / (100 - (minPercent - 1));
    return round(baseScore * factor * 2 / 3);
}

/**
 * Player total score with per-phase damping against farming.
 * Each completion inside a phase counts with weight d^j, where j is its
 * position among the player's completions of that phase sorted by score
 * (0-indexed). The damping resets on every new phase.
 * @param {Array} entries Completions as { phase, score }
 * @param {Number} d Damping factor (0..1)
 * @returns {Number}
 */
export function playerTotalScore(entries, d) {
    const byPhase = {};
    for (const { phase, score } of entries) {
        (byPhase[phase] ??= []).push(score);
    }

    let total = 0;
    for (const scores of Object.values(byPhase)) {
        scores.sort((a, b) => b - a);
        scores.forEach((score, j) => {
            total += score * Math.pow(d, j);
        });
    }
    return total;
}

export function round(num) {
    if (!('' + num).includes('e')) {
        return +(Math.round(num + 'e+' + scale) + 'e-' + scale);
    } else {
        var arr = ('' + num).split('e');
        var sig = '';
        if (+arr[1] + scale > 0) {
            sig = '+';
        }
        return +(
            Math.round(+arr[0] + 'e' + sig + (+arr[1] + scale)) +
            'e-' +
            scale
        );
    }
}
