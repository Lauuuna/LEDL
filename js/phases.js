/**
 * Phase color ramp, from tender (phase 1) to black (phase 30).
 * Soft mint that sharpens into emerald/forest before falling to black,
 * one clearly distinguishable color per phase.
 */
const PHASE_COLORS = [
    '#b7f2c1',
    '#adefb9',
    '#a3ecb1',
    '#99e9a9',
    '#8fe6a1',
    '#85e299',
    '#7bdf91',
    '#72d88a',
    '#69d082',
    '#5fc97b',
    '#56c273',
    '#4dbb6c',
    '#45b364',
    '#3ea95e',
    '#389f57',
    '#329450',
    '#2c8a49',
    '#258043',
    '#21763d',
    '#1e6d37',
    '#1a6331',
    '#175a2c',
    '#145026',
    '#114720',
    '#0e3b1b',
    '#0b3015',
    '#082410',
    '#06180b',
    '#030c05',
    '#000000',
];

export function phaseColor(phase) {
    const index = Math.min(Math.max((phase || 1) - 1, 0), PHASE_COLORS.length - 1);
    return PHASE_COLORS[index];
}

export function phaseLabel(phase) {
    return `Phase ${phase || 1}`;
}

function luminance(hex) {
    const rgb = hex
        .slice(1)
        .match(/../g)
        .map((x) => parseInt(x, 16) / 255)
        .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

function contrastRatio(a, b) {
    const la = luminance(a);
    const lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * Background and highest-contrast readable text color for a phase.
 */
export function phaseStyles(phase) {
    const color = phaseColor(phase);
    const onWhite = contrastRatio('#ffffff', color);
    const onBlack = contrastRatio('#000000', color);
    return {
        backgroundColor: color,
        color: onWhite > onBlack ? '#ffffff' : '#000000',
    };
}
