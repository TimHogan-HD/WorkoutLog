import React, { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const EXERCISES = [
  'Trap Bar Deadlift',
  'Weighted Pull-ups',
  'Landmine Press',
  'Goblet Squat',
  'Bulgarian Split Squat',
  'Single-Leg Hip Thrust',
];

const LINE_COLORS = [
  '#d4f542', // lime (accent)
  '#42d4f5', // cyan
  '#f5a142', // orange
  '#a142f5', // purple
  '#f54242', // red
  '#42f5a1', // teal
];

const CHART_HEIGHT = 520;

const TICK_STYLE = {
  fill: '#888',
  fontSize: 11,
  fontFamily: 'DM Mono, Courier New, monospace',
};

// Append noon time so the YYYY-MM-DD string is parsed in local timezone
// without UTC shifting (avoids off-by-one-day on dates near midnight).
function formatXDate(dateStr) {
  const normalized = dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`;
  const d = new Date(normalized);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function pivotProgressTracker(rows) {
  const byDate = {};
  for (const { date, exerciseName, maxTWeight } of rows) {
    if (!byDate[date]) byDate[date] = { date };
    byDate[date][exerciseName] = maxTWeight;
  }
  return Object.values(byDate).sort((a, b) => (a.date < b.date ? -1 : 1));
}

export default function Charts() {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/charts')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(json => {
        const rows = Array.isArray(json.progressTracker)
          ? json.progressTracker
          : Array.isArray(json)
            ? json
            : [];
        setChartData(pivotProgressTracker(rows));
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Failed to load chart data');
        setLoading(false);
      });
  }, []);

  const tickInterval =
    chartData && chartData.length > 6 ? Math.ceil(chartData.length / 6) : 0;

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Charts</h1>
      </header>
      <main className="app-main">
        <section className="charts-section">
          <h2 className="charts-section-title">Progress Tracker</h2>
          {loading && <p className="charts-status">Loading…</p>}
          {error && <p className="charts-status charts-status--error">{error}</p>}
          {chartData && (
            <div className="charts-chart-wrap">
              <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                <LineChart
                  data={chartData}
                  margin={{ top: 8, right: 12, left: 0, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#2e2e2e" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatXDate}
                    interval={tickInterval}
                    tick={TICK_STYLE}
                    stroke="#2e2e2e"
                  />
                  <YAxis tick={TICK_STYLE} stroke="#2e2e2e" width={40} />
                  <Tooltip
                    contentStyle={{
                      background: '#1a1a1a',
                      border: '1px solid #2e2e2e',
                      borderRadius: 8,
                      fontFamily: 'DM Mono, Courier New, monospace',
                      fontSize: 11,
                    }}
                    labelFormatter={formatXDate}
                    labelStyle={{
                      color: '#e8e8e8',
                      fontFamily: 'DM Mono, Courier New, monospace',
                      fontSize: 11,
                    }}
                    itemStyle={{
                      fontFamily: 'DM Mono, Courier New, monospace',
                      fontSize: 11,
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    wrapperStyle={{
                      paddingTop: 12,
                      fontFamily: 'DM Mono, Courier New, monospace',
                      fontSize: 11,
                      color: '#888',
                    }}
                  />
                  {EXERCISES.map((ex, i) => (
                    <Line
                      key={ex}
                      type="monotone"
                      dataKey={ex}
                      stroke={LINE_COLORS[i]}
                      dot={false}
                      strokeWidth={2}
                      connectNulls={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
