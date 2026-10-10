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

/**
 * Parse a level/record date in DD.MM.YYYY (or D.M.YY/YYYY) format.
 * Anything else (e.g. "02.XX.25", "XX.XX.XXXX", "XX.07.2025") is
 * considered unknown -> returns null so it sorts to the end.
 */
export function parseLevelDate(str) {
    if (typeof str !== 'string') return null;
    const m = str.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$/);
    if (!m) return null;
    const day = Number(m[1]);
    const month = Number(m[2]);
    let year = Number(m[3]);
    if (m[3].length === 2) year += 2000;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const d = new Date(year, month - 1, day);
    if (
        d.getFullYear() !== year ||
        d.getMonth() !== month - 1 ||
        d.getDate() !== day
    ) {
        return null;
    }
    return d.getTime();
}

/**
 * Sort records from earliest to latest. Records with an
 * unknown/invalid date go to the end, keeping their relative order.
 */
export function sortRecordsByDate(records) {
    return (records || [])
        .map((record, index) => ({ record, index }))
        .sort((a, b) => {
            const ta = parseLevelDate(a.record.date);
            const tb = parseLevelDate(b.record.date);
            if (ta !== null && tb !== null) return ta - tb || a.index - b.index;
            if (ta !== null) return -1;
            if (tb !== null) return 1;
            return a.index - b.index;
        })
        .map(({ record }) => record);
}

/**
 * The verifier is whoever completed the level first. If a 100% record
 * is dated strictly earlier than `verifiedDate` (or `verifiedDate` is
 * unknown while the record's date is known), that record author becomes
 * the verifier and the previous verifier is demoted to a regular record.
 * Ties keep the original verifier. Records are sorted earliest-first.
 */
export function normalizeLevelDates(level) {
    const records = [...(level.records || [])];
    const verifierEntry = {
        user: level.verifier,
        link: level.verification,
        percent: 100,
        date: level.verifiedDate,
    };

    const fullClears = [
        verifierEntry,
        ...records.filter((r) => Number(r.percent) === 100),
    ];

    let best = null;
    let bestTime = null;
    for (const candidate of fullClears) {
        const t = parseLevelDate(candidate.date);
        if (t === null) continue;
        if (bestTime === null || t < bestTime) {
            best = candidate;
            bestTime = t;
        }
    }

    // No known dates at all, or the original verifier is already earliest.
    if (!best || best === verifierEntry) {
        return { ...level, records: sortRecordsByDate(records) };
    }

    const next = { ...level };
    next.verifier = best.user;
    next.verification = best.link;
    next.verifiedDate = best.date;

    const rest = records.filter((r) => r !== best);
    const oldVerifier = typeof level.verifier === 'string' ? level.verifier : '';
    const samePerson =
        typeof best.user === 'string' &&
        oldVerifier &&
        best.user.toLowerCase() === oldVerifier.toLowerCase();
    const alreadyThere =
        oldVerifier &&
        rest.some(
            (r) =>
                typeof r.user === 'string' &&
                r.user.toLowerCase() === oldVerifier.toLowerCase() &&
                Number(r.percent) === 100,
        );
    if (!samePerson && !alreadyThere && oldVerifier) {
        rest.push({
            user: level.verifier,
            link: level.verification,
            percent: 100,
            date: level.verifiedDate,
        });
    }
    next.records = sortRecordsByDate(rest);
    return next;
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
                    const normalized = normalizeLevelDates(level);
                    return [
                        {
                            ...normalized,
                            path,
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
    const [list, flags, config] = await Promise.all([
        fetchList(),
        fetchFlags(),
        fetchConfig(),
    ]);
    const { d } = await loadScoring();

    const scoreMap = {};
    const errs = [];
    if (!list) {
        return [[], ['_list']];
    }

    // GDL placements by in-game level id (cached for 1h in localStorage).
    // Used for the AVG Hardest stat; missing/failed lookups are skipped.
    let gdlPositions = {};
    if (config.globalDemonlist?.enabled) {
        gdlPositions = await fetchGdlPositions(list);
    }
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
            id: level.id,
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
            if (Number(record.percent) === 100) {
                completed.push({
                    rank: rank + 1,
                    phase: level.phase,
                    level: level.name,
                    score: level.score,
                    link: record.link,
                    id: level.id,
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

        // All Records = every 100% completion (verified + completed),
        // hardest-first. Verified stays as-is.
        const allRecords = [...verified, ...completed].sort(
            (a, b) => a.rank - b.rank,
        );

        // AVG Hardest = mean Global Demonlist placement across the player's
        // 10 hardest completions (lowest GDL placements). Levels without a
        // known GDL placement are skipped; null when the player has no
        // GDL-ranked completions. With fewer than 10, averages over all
        // available ones.
        const placements = completions
            .map((c) => gdlPositions[c.id])
            .filter((p) => typeof p === 'number' && Number.isFinite(p))
            .sort((a, b) => a - b)
            .slice(0, 10);
        const avgHardest = placements.length
            ? round(
                  placements.reduce((prev, cur) => prev + cur, 0) /
                      placements.length,
              )
            : null;

        return {
            user,
            total: round(total),
            flag: flags[user] || null,
            ...scores,
            allRecords,
            avgHardest,
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