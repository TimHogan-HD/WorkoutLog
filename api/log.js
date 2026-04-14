import { notionCreate } from './_notion.js';

// Notion data source IDs
const MASTER_TRACKER_DB_ID = 'f2b6c093-c2cb-4c91-bc81-30ab5441e0b5';
const EXERCISE_LOG_DB_ID = '2cbdfa46-a6ad-4be1-b174-67d629e513dc';

// Normalize sessionType: accept string or string[] and return a single key string.
function normalizeSessionType(sessionType) {
  if (Array.isArray(sessionType)) return sessionType[0] ?? '';
  return sessionType ?? '';
}

// Map UI session keys → Notion session value
function toNotionSession(sessionType) {
  const key = normalizeSessionType(sessionType);
  if (key === 'D-S' || key === 'D-H') return 'D';
  if (key === 'Climb') return 'Climb';
  return key; // A, B, C
}

function safeNumber(val) {
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

function richText(str) {
  return [{ text: { content: String(str ?? '') } }];
}

function buildMasterProperties(header) {
  const sessionNotionVal = toNotionSession(header.sessionType);
  const props = {
    Session: {
      title: richText(header.session || ''),
    },
  };

  if (header.date) {
    props['Date'] = { date: { start: header.date } };
  }

  if (sessionNotionVal) {
    props['Session Type'] = { multi_select: [{ name: sessionNotionVal }] };
  }

  const timeMin = safeNumber(header.timeMin);
  if (timeMin !== null) props['Time (min)'] = { number: timeMin };

  const erpe = safeNumber(header.erpe);
  if (erpe !== null) props['eRPE'] = { number: erpe };

  const srpe = safeNumber(header.srpe);
  if (srpe !== null) props['sRPE'] = { number: srpe };

  if (header.notes) props['Notes'] = { rich_text: richText(header.notes) };
  if (header.recoveryNotes) props['Recovery Notes'] = { rich_text: richText(header.recoveryNotes) };

  return props;
}

function buildExerciseProperties(ex, header) {
  const sessionNotionVal = toNotionSession(header.sessionType);
  const props = {
    // Title property name is blank string
    '': {
      title: richText(ex.exercise || ''),
    },
  };

  if (ex.exercise) props['Exercise Name'] = { select: { name: ex.exercise } };
  if (sessionNotionVal) props['Session'] = { select: { name: sessionNotionVal } };

  const sets = safeNumber(ex.sets);
  if (sets !== null) props['Sets'] = { number: sets };

  if (ex.reps != null && ex.reps !== '') {
    const repsNum = safeNumber(ex.reps);
    if (repsNum !== null) {
      props['Reps'] = { number: repsNum };
    }
  }

  const rpe = safeNumber(ex.rpe);
  if (rpe !== null) props['RPE'] = { number: rpe };

  // "T Weight " — exact property name WITH trailing space
  const tWeight = safeNumber(ex.tWeight);
  if (tWeight !== null) props['T Weight '] = { number: tWeight };

  // "C Weight" — no trailing space
  const cWeight = safeNumber(ex.cWeight);
  props['C Weight'] = { number: cWeight };

  if (ex.movement != null && ex.movement !== '' && (!Array.isArray(ex.movement) || ex.movement.length > 0)) {
    // movement may arrive as a string or string[]; always write as multi_select
    const movements = Array.isArray(ex.movement) ? ex.movement : [ex.movement];
    const filtered = movements.filter(Boolean);
    if (filtered.length > 0) {
      props['Movement'] = { multi_select: filtered.map((name) => ({ name })) };
    }
  }
  if (ex.notes) props['Notes'] = { rich_text: richText(ex.notes) };

  if (header.date) props['Date'] = { date: { start: header.date } };

  return props;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { header, exercises } = req.body || {};

    if (!header) {
      return res.status(400).json({ ok: false, error: 'Missing header' });
    }
    if (!Array.isArray(exercises) || exercises.length === 0) {
      return res.status(400).json({ ok: false, error: 'Missing exercises' });
    }

    // 1) Create Master Workout Tracker entry
    await notionCreate(MASTER_TRACKER_DB_ID, buildMasterProperties(header));

    // 2) Create one Exercise Log entry per exercise
    await Promise.all(
      exercises.map((ex) =>
        notionCreate(EXERCISE_LOG_DB_ID, buildExerciseProperties(ex, header))
      )
    );

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[log] error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
