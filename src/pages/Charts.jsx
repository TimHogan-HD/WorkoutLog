import React from 'react';
import { Link } from 'wouter';

export default function Charts() {
  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Charts</h1>
      </header>
      <main className="app-main">
        <div className="charts-placeholder">
          <p className="charts-coming-soon">Coming soon</p>
          <Link href="/" className="charts-back-link">← Back to Logger</Link>
        </div>
      </main>
    </div>
  );
}
