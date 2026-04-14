import React, { useEffect, useState, useCallback } from 'react';
import SessionBar from './components/SessionBar.jsx';
import HeaderFields from './components/HeaderFields.jsx';
import ExerciseCard from './components/ExerciseCard.jsx';
import ClimbCard from './components/ClimbCard.jsx';
import { fetchBootstrap, postLog } from './lib/api.js';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function defaultHeader(sessionType) {
  const today = todayISO();
  return {
    session: `Workout ${today}`,
    date: today,
    sessionType: sessionType ?? '',
    timeMin: '',
    erpe: '',
    srpe: '',
    notes: '',
    recoveryNotes: '',
  };
}

function emptyExercise() {
  return { exercise: '', sets: '', reps: '', tWeight: '', cWeight: '', rpe: '', notes: '', superset: null, loadIntensity: null, movement: null };
}

function emptyClimb() {
  return { exercise: '', rpe: '', notes: '' };
}

function libraryToCards(items) {
  return items.map((item) => ({
    exercise: item.exercise ?? '',
    sets: item.sets ?? '',
    reps: item.reps ?? '',
    tWeight: '',
    cWeight: '',
    rpe: '',
    notes: '',
    superset: item.superset ?? null,
    loadIntensity: item.loadIntensity ?? null,
    movement: item.movement ?? null,
  }));
}

export default function App() {
  const [bootstrapData, setBootstrapData] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [loading, setLoading] = useState(true);

  const [selectedSession, setSelectedSession] = useState(null);
  const [header, setHeader] = useState(defaultHeader(null));
  const [cards, setCards] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    fetchBootstrap()
      .then((data) => {
        setBootstrapData(data);
        setLoading(false);
      })
      .catch((err) => {
        setLoadError(err.message);
        setLoading(false);
      });
  }, []);

  const handleSessionSelect = useCallback(
    (session) => {
      setSelectedSession(session);
      setSubmitError(null);
      setSubmitSuccess(false);

      if (!session) {
        setCards([]);
        setHeader(defaultHeader(null));
        return;
      }

      setHeader((h) => ({ ...h, sessionType: session }));

      if (session === 'Climb') {
        setCards([emptyClimb()]);
        return;
      }

      const items = bootstrapData?.library?.[session] ?? [];
      setCards(libraryToCards(items));
    },
    [bootstrapData]
  );

  function addCard() {
    if (selectedSession === 'Climb') {
      setCards((c) => [...c, emptyClimb()]);
    } else {
      setCards((c) => [...c, emptyExercise()]);
    }
  }

  function removeCard(idx) {
    setCards((c) => c.filter((_, i) => i !== idx));
  }

  function updateCard(idx, updated) {
    setCards((c) => c.map((card, i) => (i === idx ? updated : card)));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      // Derive movement from library at submit time to avoid stale card state
      const exercises = cards.map((card) => ({
        ...card,
        movement: card.exercise && card.exercise in exerciseMovementMap
          ? exerciseMovementMap[card.exercise]
          : (card.movement ?? null),
      }));
      await postLog({ header, exercises });
      setSubmitSuccess(true);
      // Reset form: deselect session and reset header to today's defaults
      setSelectedSession(null);
      setCards([]);
      setHeader(defaultHeader(null));
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Build full exercise list for dropdowns
  const allExercises = bootstrapData
    ? Object.values(bootstrapData.library)
        .flat()
        .map((e) => e.exercise)
        .filter(Boolean)
        .filter((v, i, a) => a.indexOf(v) === i)
        .sort()
    : [];

  // Map exercise name → movement for lookup at submit time
  const exerciseMovementMap = bootstrapData
    ? Object.values(bootstrapData.library)
        .flat()
        .reduce((acc, item) => {
          if (item.exercise) acc[item.exercise] = item.movement ?? null;
          return acc;
        }, {})
    : {};

  const history = bootstrapData?.history ?? {};

  if (loading) {
    return (
      <div className="app-loading">
        <p>Loading…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="app-loading">
        <p className="error-text">Failed to load: {loadError}</p>
        <button className="btn-primary" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Workout Logger</h1>
      </header>

      <main className="app-main">
        <SessionBar selected={selectedSession} onSelect={handleSessionSelect} />

        {selectedSession && (
          <form className="log-form" onSubmit={handleSubmit} noValidate>
            <HeaderFields header={header} onChange={setHeader} />

            <section className="cards-section">
              {selectedSession === 'Climb'
                ? cards.map((card, idx) => (
                    <ClimbCard
                      key={idx}
                      exercise={card}
                      onChange={(updated) => updateCard(idx, updated)}
                      onRemove={() => removeCard(idx)}
                    />
                  ))
                : cards.map((card, idx) => (
                    <ExerciseCard
                      key={idx}
                      exercise={card}
                      history={history}
                      allExercises={allExercises}
                      onChange={(updated) => updateCard(idx, updated)}
                      onRemove={() => removeCard(idx)}
                    />
                  ))}

              <button type="button" className="add-card-btn" onClick={addCard}>
                + Add Exercise
              </button>
            </section>

            {submitSuccess && (
              <p className="success-text">✓ Logged to Notion successfully!</p>
            )}
            {submitError && (
              <p className="error-text">Error: {submitError}</p>
            )}

            <div className="submit-bar">
              <button
                type="submit"
                className="btn-primary log-btn"
                disabled={submitting || cards.length === 0}
              >
                {submitting ? 'logging…' : 'LOG TO NOTION'}
              </button>
            </div>
          </form>
        )}

        {!selectedSession && (
          <p className="hint-select">Select a session above to start logging.</p>
        )}
      </main>
    </div>
  );
}
