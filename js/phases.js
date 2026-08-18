/**
 * Phase color ramp, from tender (phase 1) to black (phase 30).
 * A soft rose hue that darkens gradually, one color per phase.
 */
const PHASE_COLORS = [
    '#ecd0d5',
    '#e7c6cc',
    '#e1bcc3',
    '#dcb2ba',
    '#d6a8b1',
    '#d09fa9',
    '#ca96a0',
    '#c48d98',
    '#bd848f',
    '#b77b87',
    '#b0737f',
    '#a86b77',
    '#a16370',
    '#975e69',
    '#8c5a64',
    '#81555e',
    '#765158',
    '#6c4c52',
    '#62474c',
    '#584146',
    '#4e3c3f',
    '#443639',
    '#3b3032',
    '#322a2c',
    '#292325',
    '#201d1e',
    '#181616',
    '#100f0f',
    '#080808',
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

/**
 * Background and readable text color for a phase.
 */
export function phaseStyles(phase) {
    const color = phaseColor(phase);
    return {
        backgroundColor: color,
        color: luminance(color) > 0.4 ? '#000000' : '#ffffff',
    };
}
