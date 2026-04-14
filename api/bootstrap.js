import {
  notionQuery,
  notionQueryAll,
  getSelect,
  getMultiSelect,
  getNumber,
  getRichText,
  getDate,
} from './_notion.js';

// Notion data source IDs
const LIBRARY_DB_ID = 'dae564a6-44ca-410b-8681-54ac81f777cc';
const EXERCISE_LOG_DB_ID = '2cbdfa46-a6ad-4be1-b174-67d629e513dc';

// Map Notion session values → UI session keys
const SESSION_MAP = {
  A: 'A',
  B: 'B',
  C: 'C',
  'D - Shoulder/Spine': 'D-S',
  'D - Hip': 'D-H',
};

function mapLibraryItem(page) {
  const p = page.properties || {};
  const sessionRaw = getSelect(p, 'Session');
  const sessionKey = SESSION_MAP[sessionRaw] ?? sessionRaw;

  return {
    sessionKey,
    item: {
      exercise: getSelect(p, 'Exercise') ?? '',
      sets: getNumber(p, 'Sets'),
      reps: getRichText(p, 'Reps') || getNumber(p, 'Reps'),
      loadIntensity: getRichText(p, 'Load / Intensity') || getRichText(p, 'Load/Intensity') || null,
      superset: getRichText(p, 'Superset') || getSelect(p, 'Superset') || null,
      tempo: getRichText(p, 'Tempo') || null,
      category: getSelect(p, 'Category') || getMultiSelect(p, 'Category').join(', ') || null,
    },
  };
}

function computeHistory(logEntries) {
  // Group by exercise name → { date → { tWeights, cWeights } }
  const byExercise = {};

  for (const page of logEntries) {
    const p = page.properties || {};
    const name = getSelect(p, 'Exercise Name') ?? getRichText(p, 'Exercise Name');
    if (!name) continue;

    const dateStr = getDate(p, 'Date');
    // "T Weight " has a trailing space — exact property name required
    const tWeight = getNumber(p, 'T Weight ');
    // "C Weight" — no trailing space
    const cWeight = getNumber(p, 'C Weight');

    if (tWeight == null && cWeight == null) continue;

    if (!byExercise[name]) byExercise[name] = {};
    if (!byExercise[name][dateStr]) byExercise[name][dateStr] = { tWeights: [], cWeights: [] };
    if (tWeight != null) byExercise[name][dateStr].tWeights.push(tWeight);
    if (cWeight != null) byExercise[name][dateStr].cWeights.push(cWeight);
  }

  const history = {};
  for (const [name, dateMap] of Object.entries(byExercise)) {
    const allTWeights = Object.values(dateMap).flatMap((d) => d.tWeights);
    const allCWeights = Object.values(dateMap).flatMap((d) => d.cWeights);
    const tAllTimeMax = allTWeights.length ? Math.max(...allTWeights) : null;
    const cAllTimeMax = allCWeights.length ? Math.max(...allCWeights) : null;

    // Find most recent date that has data
    const sortedDates = Object.keys(dateMap)
      .filter(Boolean)
      .sort()
      .reverse();

    const tLastMax = sortedDates.length && dateMap[sortedDates[0]].tWeights.length
      ? Math.max(...dateMap[sortedDates[0]].tWeights)
      : null;
    const cLastMax = sortedDates.length && dateMap[sortedDates[0]].cWeights.length
      ? Math.max(...dateMap[sortedDates[0]].cWeights)
      : null;

    history[name] = { tLastMax, tAllTimeMax, cLastMax, cAllTimeMax };
  }

  return history;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    // Fetch library and exercise log in parallel
    const [libraryData, logEntries] = await Promise.all([
      notionQuery(LIBRARY_DB_ID, { page_size: 100 }),
      notionQueryAll(EXERCISE_LOG_DB_ID, { page_size: 100 }),
    ]);

    // Handle library pagination (unlikely to exceed 100 but handle it)
    let allLibraryPages = libraryData.results || [];
    let libCursor = libraryData.next_cursor;
    while (libraryData.has_more && libCursor) {
      const more = await notionQuery(LIBRARY_DB_ID, { page_size: 100 }, libCursor);
      allLibraryPages.push(...(more.results || []));
      libCursor = more.next_cursor;
      if (!more.has_more) break;
    }

    // Build library keyed by session
    const library = { A: [], B: [], C: [], 'D-S': [], 'D-H': [] };
    for (const page of allLibraryPages) {
      const { sessionKey, item } = mapLibraryItem(page);
      if (library[sessionKey]) {
        library[sessionKey].push(item);
      }
    }

    const history = computeHistory(logEntries);

    return res.status(200).json({ ok: true, library, history });
  } catch (err) {
    console.error('[bootstrap] error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
