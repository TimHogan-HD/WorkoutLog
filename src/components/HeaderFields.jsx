import React, { useState } from 'react';

export default function HeaderFields({ header, onChange }) {
  const [showNotes, setShowNotes] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);

  function set(field, value) {
    onChange({ ...header, [field]: value });
  }

  return (
    <section className="header-fields">
      <div className="field-row">
        <label className="field-label">Session Name</label>
        <input
          className="field-input"
          type="text"
          value={header.session}
          onChange={(e) => set('session', e.target.value)}
          placeholder="Workout YYYY-MM-DD"
        />
      </div>

      <div className="field-row">
        <label className="field-label">Date</label>
        <input
          className="field-input"
          type="date"
          value={header.date}
          onChange={(e) => set('date', e.target.value)}
        />
      </div>

      <div className="field-row-group">
        <div className="field-row half">
          <label className="field-label">Duration (min)</label>
          <input
            className="field-input"
            type="number"
            min="0"
            value={header.timeMin}
            onChange={(e) => set('timeMin', e.target.value)}
            placeholder="60"
          />
        </div>
        <div className="field-row half">
          <label className="field-label">eRPE</label>
          <input
            className="field-input"
            type="number"
            min="1"
            max="10"
            step="0.5"
            value={header.erpe}
            onChange={(e) => set('erpe', e.target.value)}
            placeholder="7"
          />
        </div>
        <div className="field-row half">
          <label className="field-label">sRPE</label>
          <input
            className="field-input"
            type="number"
            min="1"
            max="10"
            step="0.5"
            value={header.srpe}
            onChange={(e) => set('srpe', e.target.value)}
            placeholder="7"
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
            value={header.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Session notes..."
            rows={3}
          />
        )}
      </div>

      <div className="expandable-row">
        <button
          className="expand-btn"
          type="button"
          onClick={() => setShowRecovery((v) => !v)}
          aria-expanded={showRecovery}
        >
          Recovery Notes {showRecovery ? '▲' : '▼'}
        </button>
        {showRecovery && (
          <textarea
            className="field-textarea"
            value={header.recoveryNotes}
            onChange={(e) => set('recoveryNotes', e.target.value)}
            placeholder="Recovery notes..."
            rows={3}
          />
        )}
      </div>
    </section>
  );
}
