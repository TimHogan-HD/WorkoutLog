import React, { useState } from 'react';

const CLIMB_EXERCISES = [
  'Gym Bouldering',
  'Gym Ropes',
  'Outdoor Bouldering',
  'Outdoor Ropes',
];

export default function ClimbCard({ exercise, onChange, onRemove }) {
  const [showNotes, setShowNotes] = useState(false);

  function set(field, value) {
    onChange({ ...exercise, [field]: value });
  }

  return (
    <div className="exercise-card climb-card">
      <div className="card-header">
        <select
          className="exercise-select"
          value={exercise.exercise}
          onChange={(e) => set('exercise', e.target.value)}
          aria-label="Climb type"
        >
          <option value="">— Select type —</option>
          {CLIMB_EXERCISES.map((ex) => (
            <option key={ex} value={ex}>
              {ex}
            </option>
          ))}
        </select>
        <button
          className="remove-btn"
          type="button"
          onClick={onRemove}
          aria-label="Remove climb"
        >
          ✕
        </button>
      </div>

      <div className="card-row">
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
      </div>

      <div className="expandable-row">
        <button
          className="expand-btn"
          type="button"
          onClick={() => setShowNotes((v) => !v)}
          aria-expanded={showNotes}
        >
          Notes {showNotes ? '▲' : '▼'}
        </button>
        {showNotes && (
          <textarea
            className="field-textarea"
            value={exercise.notes ?? ''}
            onChange={(e) => set('notes', e.target.value)}
            rows={2}
            placeholder="Climb notes..."
          />
        )}
      </div>
    </div>
  );
}
