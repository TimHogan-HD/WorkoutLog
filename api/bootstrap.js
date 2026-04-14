import {
  notionQuery,
  notionQueryAll,
  getSelect,
  getMultiSelect,
  getNumber,
  getRichText,
  getDate,
} from './_notion.js';

// Notion database page IDs
const LIBRARY_DB_ID = 'd2b13aa6657441bfb331da49b9e464bf';
const EXERCISE_LOG_DB_ID = '74478a97f7604058b6f15fb4ce130df6';

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
  // Group by exercise name → { date → [tWeights] }
  const byExercise = {};

  for (const page of logEntries) {
    const p = page.properties || {};
    const name = getSelect(p, 'Exercise Name') ?? getRichText(p, 'Exercise Name');
    if (!name) continue;

    const dateStr = getDate(p, 'Date');
    // "T Weight " has a trailing space — exact property name required
    const tWeight = getNumber(p, 'T Weight ');
    if (tWeight == null) continue;

    if (!byExercise[name]) byExercise[name] = {};
    if (!byExercise[name][dateStr]) byExercise[name][dateStr] = [];
    byExercise[name][dateStr].push(tWeight);
  }

  const history = {};
  for (const [name, dateMap] of Object.entries(byExercise)) {
    const allWeights = Object.values(dateMap).flat();
    const allTimeMax = allWeights.length ? Math.max(...allWeights) : null;

    // Find most recent date that has data
    const sortedDates = Object.keys(dateMap)
      .filter(Boolean)
      .sort()
      .reverse();
    const lastMax = sortedDates.length
      ? Math.max(...dateMap[sortedDates[0]])
      : null;

    history[name] = { lastMax, allTimeMax };
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
