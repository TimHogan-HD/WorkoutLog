import React from 'react';

const SESSIONS = ['A', 'B', 'C', 'D-S', 'D-H', 'Climb'];

export default function SessionBar({ selected, onSelect }) {
  return (
    <nav className="session-bar" role="tablist" aria-label="Session selector">
      {SESSIONS.map((s) => (
        <button
          key={s}
          role="tab"
          aria-selected={selected === s}
          className={`session-btn${selected === s ? ' active' : ''}`}
          onClick={() => onSelect(selected === s ? null : s)}
        >
          {s}
        </button>
      ))}
    </nav>
  );
}
