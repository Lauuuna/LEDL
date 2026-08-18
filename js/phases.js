/**
 * Phase color ramp, from tender (phase 1) to black (phase 30).
 * Soft rose that sharpens into crimson/wine before falling to black,
 * one clearly distinguishable color per phase.
 */
const PHASE_COLORS = [
    '#f2b7c1',
    '#efadb9',
    '#eca3b1',
    '#e999a9',
    '#e68fa1',
    '#e28599',
    '#df7b91',
    '#d8728a',
    '#d06982',
    '#c95f7b',
    '#c25673',
    '#bb4d6c',
    '#b34564',
    '#a93e5e',
    '#9f3857',
    '#943250',
    '#8a2c49',
    '#802543',
    '#76213d',
    '#6d1e37',
    '#631a31',
    '#5a172c',
    '#501426',
    '#471120',
    '#3b0e1b',
    '#300b15',
    '#240810',
    '#18060b',
    '#0c0305',
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
