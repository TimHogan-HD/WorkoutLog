import {
  notionQueryAll,
  getSelect,
  getMultiSelect,
  getNumber,
  getRichText,
  getDate,
} from './_notion.js';

// Same Exercise Log data source as bootstrap.js
const EXERCISE_LOG_DB_ID = '2cbdfa46-a6ad-4be1-b174-67d629e513dc';

const MS_PER_DAY = 86400000;

const PROGRESS_EXERCISES = new Set([
  'Weighted Pull-ups',
  'Bulgarian Split Squat',
  'Trap Bar Deadlift',
  'Landmine Press',
  'Goblet Squat',
  'Single-Leg Hip Thrust',
]);

// Returns ISO week string in YYYY-WWW format (e.g. "2026-W03")
function toISOWeek(dateStr) {
  // Use UTC to keep week calculations stable across DST transitions
  const d = new Date(dateStr + 'T12:00:00Z');
  const day = d.getUTCDay() || 7; // Monday=1 … Sunday=7
  // Shift to nearest Thursday (ISO week is defined by its Thursday)
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1, 12, 0, 0));
  const weekNo = Math.ceil((((d - yearStart) / MS_PER_DAY) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function buildProgressTracker(pages) {
  // Group by (date + exerciseName), keep max T Weight per group
  const groups = {};
  for (const page of pages) {
    const p = page.properties || {};
    const name = getSelect(p, 'Exercise Name') ?? getRichText(p, 'Exercise Name');
    if (!name || !PROGRESS_EXERCISES.has(name)) continue;

    const dateStr = getDate(p, 'Date');
    if (!dateStr) continue;

    // "T Weight " has a trailing space — exact property name required
    const tWeight = getNumber(p, 'T Weight ');
    if (tWeight == null) continue;

    const key = `${dateStr}|${name}`;
    if (!groups[key] || tWeight > groups[key].maxTWeight) {
      groups[key] = { date: dateStr, exerciseName: name, maxTWeight: tWeight };
    }
  }
  return Object.values(groups).sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
  );
}

function buildVolumeByWeek(pages) {
  // Group by (ISO week + movement), sum Volume; fan out multi-select Movement
  const groups = {};
  for (const page of pages) {
    const p = page.properties || {};
    const dateStr = getDate(p, 'Date');
    if (!dateStr) continue;

    const volume = getNumber(p, 'Volume') ?? 0;
    const movements = getMultiSelect(p, 'Movement');
    const week = toISOWeek(dateStr);

    for (const movement of movements) {
      const key = `${week}|${movement}`;
      if (!groups[key]) groups[key] = { week, movement, volume: 0 };
      groups[key].volume += volume;
    }
  }
  return Object.values(groups).sort((a, b) =>
    a.week < b.week ? -1 : a.week > b.week ? 1 : 0,
  );
}

function buildClimbSessions(pages) {
  // Filter to Session == "Climb", group by date, keep max RPE per date
  const groups = {};
  for (const page of pages) {
    const p = page.properties || {};
    if (getSelect(p, 'Session') !== 'Climb') continue;

    const dateStr = getDate(p, 'Date');
    if (!dateStr) continue;

    const rpe = getNumber(p, 'RPE');
    if (rpe == null) continue;

    if (!groups[dateStr] || rpe > groups[dateStr].maxRPE) {
      groups[dateStr] = { date: dateStr, maxRPE: rpe };
    }
  }
  return Object.values(groups).sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
  );
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const pages = await notionQueryAll(EXERCISE_LOG_DB_ID, { page_size: 100 });

    const progressTracker = buildProgressTracker(pages);
    const volumeByWeek = buildVolumeByWeek(pages);
    const climbSessions = buildClimbSessions(pages);

    return res.status(200).json({ ok: true, progressTracker, volumeByWeek, climbSessions });
  } catch (err) {
    console.error('[charts] error:', err);
    return res.status(500).json({ ok: false, error: 'Failed to fetch chart data' });
  }
}
