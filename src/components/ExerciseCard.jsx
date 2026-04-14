import React, { useState } from 'react';

export default function ExerciseCard({ exercise, history, allExercises, onChange, onRemove }) {
  const [showExtra, setShowExtra] = useState(false);

  const hist = history?.[exercise.exercise] ?? null;
  const lastMax = hist?.lastMax ?? null;
  const allTimeMax = hist?.allTimeMax ?? null;

  function set(field, value) {
    onChange({ ...exercise, [field]: value });
  }

  const histNote =
    lastMax != null || allTimeMax != null
      ? `Last: ${lastMax ?? '—'} · Max: ${allTimeMax ?? '—'}`
      : null;

  return (
    <div className="exercise-card">
      <div className="card-header">
        <select
          className="exercise-select"
          value={exercise.exercise}
          onChange={(e) => set('exercise', e.target.value)}
          aria-label="Exercise"
        >
          <option value="">— Select exercise —</option>
          {allExercises.map((ex) => (
            <option key={ex} value={ex}>
              {ex}
            </option>
          ))}
        </select>
        <button
          className="remove-btn"
          type="button"
          onClick={onRemove}
          aria-label="Remove exercise"
        >
          ✕
        </button>
      </div>

      {exercise.superset && (
        <span className="tag superset-tag">Superset: {exercise.superset}</span>
      )}

      {exercise.loadIntensity && (
        <p className="hint-text">Load / Intensity: {exercise.loadIntensity}</p>
      )}

      <div className="card-row">
        <div className="card-field">
          <label className="field-label">Sets</label>
          <input
            className="field-input small"
            type="number"
            min="0"
            value={exercise.sets ?? ''}
            onChange={(e) => set('sets', e.target.value)}
          />
        </div>
        <div className="card-field">
          <label className="field-label">Reps</label>
          <input
            className="field-input small"
            type="text"
            value={exercise.reps ?? ''}
            onChange={(e) => set('reps', e.target.value)}
          />
        </div>
        <div className="card-field">
          <label className="field-label">T Weight</label>
          <input
            className="field-input small"
            type="number"
            min="0"
            step="0.5"
            value={exercise.tWeight ?? ''}
            onChange={(e) => set('tWeight', e.target.value)}
          />
          {histNote && <span className="hist-note">{histNote}</span>}
        </div>
      </div>

      <div className="expandable-row">
        <button
          className="expand-btn"
          type="button"
          onClick={() => setShowExtra((v) => !v)}
          aria-expanded={showExtra}
        >
          RPE / Notes {showExtra ? '▲' : '▼'}
        </button>
        {showExtra && (
          <>
            <div className="card-field">
              <label className="field-label">RPE</label>
              <input
                className="field-input small"
                type="number"
                min="1"
                max="10"
                step="0.5"
                value={exercise.rpe ?? ''}
                onChange={(e) => set('rpe', e.target.value)}
              />
            </div>
            <div className="card-field">
              <label className="field-label">Notes</label>
              <textarea
                className="field-textarea"
                value={exercise.notes ?? ''}
                onChange={(e) => set('notes', e.target.value)}
                rows={2}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
