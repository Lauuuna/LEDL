import {
    round,
    normalizeScoring,
    levelScore,
    percentPointsScore,
    playerTotalScore,
} from './score.js';

/**
 * Path to directory containing `_list.json` and all levels
 */
const dir = 'data';

let scoringCache = null;

export async function fetchConfig() {
    try {
        const res = await fetch(`${dir}/_config.json`);
        return await res.json();
    } catch {
        return {};
    }
}

async function loadScoring() {
    if (scoringCache) {
        return scoringCache;
    }

    let cfg = {};
    try {
        cfg = (await fetchConfig()).scoring;
    } catch {
        cfg = {};
    }

    try {
        scoringCache = normalizeScoring(cfg);
    } catch (e) {
        console.error(e.message);
        scoringCache = normalizeScoring();
    }

    return scoringCache;
}

export async function fetchList() {
    const listResult = await fetch(`${dir}/_list.json`);
    try {
        const list = await listResult.json();

        const raw = await Promise.all(
            list.map(async (path, rank) => {
                const levelResult = await fetch(`${dir}/${path}.json`);
                try {
                    const level = await levelResult.json();
                    return [
                        {
                            ...level,
                            path,
                            records: (level.records || []).sort(
                                (a, b) => b.percent - a.percent,
                            ),
                        },
                        null,
                    ];
                } catch {
                    console.error(`Failed to load level #${rank + 1} ${path}.`);
                    return [null, path];
                }
            }),
        );

        // Assign each level its position within its phase and the phase size
        // (size is derived from the levels currently in the phase, not stored)
        const phaseCounts = {};
        for (const [level] of raw) {
            if (!level) continue;
            const phase = level.phase ?? 1;
            phaseCounts[phase] = (phaseCounts[phase] || 0) + 1;
        }
        const position = {};
        for (const [level] of raw) {
            if (!level) continue;
            const phase = level.phase ?? 1;
            position[phase] = (position[phase] || 0) + 1;
            level.phase = phase;
            level.phaseSize = phaseCounts[phase];
            level.positionInPhase = position[phase];
        }

        const scoring = await loadScoring();
        for (const [level] of raw) {
            if (level) {
                level.score = levelScore(level, scoring);
            }
        }

        return raw;
    } catch {
        console.error(`Failed to load list.`);
        return null;
    }
}

export async function fetchFlags() {
    try {
        const res = await fetch(`${dir}/_flags.json`);
        return await res.json();
    } catch {
        return {};
    }
}

export async function fetchEditors() {
    try {
        const editorsResults = await fetch(`${dir}/_editors.json`);
        const editors = await editorsResults.json();
        return editors;
    } catch {
        return null;
    }
}

export async function fetchLeaderboard() {
    const [list, flags] = await Promise.all([fetchList(), fetchFlags()]);
    const { d } = await loadScoring();

    const scoreMap = {};
    const errs = [];
    list.forEach(([level, err], rank) => {
        if (err) {
            errs.push(err);
            return;
        }

        // Verification
        const verifier = Object.keys(scoreMap).find(
            (u) => u.toLowerCase() === level.verifier.toLowerCase(),
        ) || level.verifier;
        scoreMap[verifier] ??= {
            verified: [],
            completed: [],
            progressed: [],
        };
        const { verified } = scoreMap[verifier];
        verified.push({
            rank: rank + 1,
            phase: level.phase,
            level: level.name,
            score: level.score,
            link: level.verification,
        });

        // Records
        level.records.forEach((record) => {
            const user = Object.keys(scoreMap).find(
                (u) => u.toLowerCase() === record.user.toLowerCase(),
            ) || record.user;
            scoreMap[user] ??= {
                verified: [],
                completed: [],
                progressed: [],
            };
            const { completed, progressed } = scoreMap[user];
            if (record.percent === 100) {
                completed.push({
                    rank: rank + 1,
                    phase: level.phase,
                    level: level.name,
                    score: level.score,
                    link: record.link,
                });
                return;
            }

            progressed.push({
                rank: rank + 1,
                phase: level.phase,
                level: level.name,
                percent: record.percent,
                score: percentPointsScore(
                    level.score,
                    record.percent,
                    level.percentToQualify,
                ),
                link: record.link,
            });
        });
    });

    // Wrap in extra Object containing the user and total score
    const res = Object.entries(scoreMap).map(([user, scores]) => {
        const { verified, completed, progressed } = scores;
        const completions = [...verified, ...completed];

        // Anti-farm: damp repeated completions within the same phase,
        // partial progress is added flat on top
        const total =
            playerTotalScore(completions, d) +
            progressed.reduce((prev, cur) => prev + cur.score, 0);

        // Hardest completed level = lowest rank among verified + completed
        const hardest = completions.length
            ? completions.reduce((a, b) => a.rank < b.rank ? a : b)
            : null;
        if (hardest) hardest.isHardest = true;

        return {
            user,
            total: round(total),
            flag: flags[user] || null,
            ...scores,
        };
    });

    // Sort by total score
    return [res.sort((a, b) => b.total - a.total), errs];
}

const GDL_CACHE_KEY = 'gdl_positions';
const GDL_CACHE_TTL = 60 * 60 * 1000;
const GDL_API_BASE = 'https://api.demonlist.org';

function getGdlCache() {
    try {
        const cached = localStorage.getItem(GDL_CACHE_KEY);
        if (!cached) return null;
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp > GDL_CACHE_TTL) {
            localStorage.removeItem(GDL_CACHE_KEY);
            return null;
        }
        return data;
    } catch {
        return null;
    }
}

function setGdlCache(data) {
    try {
        localStorage.setItem(GDL_CACHE_KEY, JSON.stringify({
            data,
            timestamp: Date.now(),
        }));
    } catch {
    }
}

async function fetchGdlLevel(ingameId) {
    const cache = getGdlCache();
    if (cache && cache[ingameId] !== undefined) {
        return cache[ingameId];
    }

    try {
        const res = await fetch(`${GDL_API_BASE}/level/classic/get?ingame_id=${ingameId}`);
        if (!res.ok) {
            if (res.status === 404) return null;
            throw new Error(`GDL API error: ${res.status}`);
        }
        const json = await res.json();
        if (json.message !== 'success') return null;

        const placement = json.data?.placement ?? null;
        const newCache = { ...cache, [ingameId]: placement };
        setGdlCache(newCache);
        return placement;
    } catch (e) {
        console.warn('Failed to fetch Global Demon List position:', e.message);
        return null;
    }
}

export async function fetchGdlPositions(levels) {
    const config = await fetchConfig();
    if (!config.globalDemonlist?.enabled) return {};

    const results = {};
    await Promise.all(
        levels.map(async ([level]) => {
            if (!level?.id) return;
            const placement = await fetchGdlLevel(level.id);
            if (placement) results[level.id] = placement;
        })
    );
    return results;
}