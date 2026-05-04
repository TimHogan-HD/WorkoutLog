import React, { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  LabelList,
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

const MOVEMENTS = ['Pull', 'Push', 'Hinge', 'Core', 'Legs'];

const MOVEMENT_COLORS = {
  Pull:  '#7c5544',
  Push:  '#9b9a97',
  Hinge: '#9b59b6',
  Core:  '#e2b714',
  Legs:  '#e67e22',
};

const CHART_HEIGHT = 520;
const MAX_VISIBLE_TICKS = 6;
// Limit bar charts to this many of the most-recent weeks so bars stay wide enough to read.
const VOLUME_WEEKS_WINDOW = 12;

const TICK_STYLE = {
  fill: '#888',
  fontSize: 11,
  fontFamily: 'DM Mono, Courier New, monospace',
};

const LEGEND_STYLE = {
  paddingTop: 12,
  fontFamily: 'DM Mono, Courier New, monospace',
  fontSize: 11,
  color: '#888',
};

const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#1a1a1a',
    border: '1px solid #2e2e2e',
    borderRadius: 8,
    fontFamily: 'DM Mono, Courier New, monospace',
    fontSize: 11,
  },
  labelStyle: {
    color: '#e8e8e8',
    fontFamily: 'DM Mono, Courier New, monospace',
    fontSize: 11,
  },
  itemStyle: {
    fontFamily: 'DM Mono, Courier New, monospace',
    fontSize: 11,
  },
};

function labelListStyle(movement) {
  return {
    fill: MOVEMENT_COLORS[movement],
    fontSize: 9,
    fontFamily: 'DM Mono, Courier New, monospace',
  };
}

// Append noon time so the YYYY-MM-DD string is parsed in local timezone
// without UTC shifting (avoids off-by-one-day on dates near midnight).
function formatXDate(dateStr) {
  const normalized = dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`;
  const d = new Date(normalized);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Convert "YYYY-W##" ISO week string to the Monday Date of that week.
function isoWeekToDate(weekStr) {
  const [yearStr, weekPart] = weekStr.split('-W');
  const year = parseInt(yearStr, 10);
  const week = parseInt(weekPart, 10);
  // Jan 4 is always in ISO week 1 of its year.
  const jan4 = new Date(year, 0, 4);
  const dow = jan4.getDay() || 7; // Mon=1 … Sun=7
  const week1Mon = new Date(jan4);
  week1Mon.setDate(jan4.getDate() - (dow - 1));
  const result = new Date(week1Mon);
  result.setDate(week1Mon.getDate() + (week - 1) * 7);
  return result;
}

function formatWeekTick(weekStr) {
  return isoWeekToDate(weekStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function pivotProgressTracker(rows) {
  const byDate = {};
  for (const { date, exerciseName, maxTWeight } of rows) {
    if (!byDate[date]) byDate[date] = { date };
    byDate[date][exerciseName] = maxTWeight;
  }
  return Object.values(byDate).sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0,
  );
}

// Pivot volumeByWeek rows into one object per week, keyed by movement.
// Weeks where all movements are 0 are removed.
function pivotVolumeByWeek(rows) {
  const byWeek = {};
  for (const { week, movement, volume } of rows) {
    if (!byWeek[week]) byWeek[week] = { week };
    byWeek[week][movement] = (byWeek[week][movement] || 0) + volume;
  }
  const sorted = Object.values(byWeek).sort((a, b) =>
    a.week < b.week ? -1 : a.week > b.week ? 1 : 0,
  );
  return sorted.filter(row => MOVEMENTS.some(m => (row[m] || 0) > 0));
}

// Transform pivoted weekly rows into a running cumulative sum per movement.
function computeCumulativeVolume(pivotedRows) {
  const totals = {};
  return pivotedRows.map(row => {
    const cumRow = { week: row.week };
    for (const m of MOVEMENTS) {
      totals[m] = (totals[m] || 0) + (row[m] || 0);
      cumRow[m] = totals[m];
    }
    return cumRow;
  });
}

export default function Charts({ onMenuOpen }) {
  const [chartData, setChartData] = useState(null);
  const [volumeData, setVolumeData] = useState(null);
  const [cumulativeData, setCumulativeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/charts')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(json => {
        // Check the API-level ok flag (may be false on HTTP 200 error responses)
        if (json.ok === false) {
          throw new Error(json.error || 'API returned an error');
        }
        const rows = Array.isArray(json.progressTracker)
          ? json.progressTracker
          : Array.isArray(json)
            ? json
            : [];
        setChartData(pivotProgressTracker(rows));

        const volRows = Array.isArray(json.volumeByWeek) ? json.volumeByWeek : [];
        const pivoted = pivotVolumeByWeek(volRows);
        setVolumeData(pivoted);
        setCumulativeData(computeCumulativeVolume(pivoted));

        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Failed to load chart data');
        setLoading(false);
      });
  }, []);

  // Recharts interval={n} skips n ticks between labels, so visible count ≈ len / (n+1).
  // Subtract 1 to convert "desired label count" to the recharts interval value.
  const tickInterval =
    chartData && chartData.length > MAX_VISIBLE_TICKS
      ? Math.max(0, Math.ceil(chartData.length / MAX_VISIBLE_TICKS) - 1)
      : 0;

  // Slice to the most-recent weeks window so bars remain wide enough to read on mobile.
  // Cumulative values are correct because computeCumulativeVolume ran over the full history;
  // we only trim the displayed window here.
  const volDisplayData = volumeData ? volumeData.slice(-VOLUME_WEEKS_WINDOW) : null;
  const cumDisplayData = cumulativeData ? cumulativeData.slice(-VOLUME_WEEKS_WINDOW) : null;

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Charts</h1>
        {onMenuOpen && (
          <button
            type="button"
            className="hamburger-btn"
            aria-label="Open menu"
            onClick={onMenuOpen}
          >
            <span className="hamburger-bar" />
            <span className="hamburger-bar" />
            <span className="hamburger-bar" />
          </button>
        )}
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
                      // connectNulls={false} keeps lines broken for missing dates
                      // rather than interpolating through gaps (avoids misleading trends)
                      connectNulls={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="charts-section">
          <h2 className="charts-section-title">Volume Tracker</h2>
          {loading && <p className="charts-status">Loading…</p>}
          {error && <p className="charts-status charts-status--error">{error}</p>}
          {volDisplayData && volDisplayData.length > 0 && (
            <div className="charts-chart-wrap">
              <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                <BarChart
                  data={volDisplayData}
                  margin={{ top: 16, right: 12, left: 0, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#2e2e2e" />
                  <XAxis
                    dataKey="week"
                    tickFormatter={formatWeekTick}
                    interval={Math.max(
                      0,
                      Math.ceil(volDisplayData.length / MAX_VISIBLE_TICKS) - 1,
                    )}
                    tick={TICK_STYLE}
                    stroke="#2e2e2e"
                  />
                  <YAxis tick={TICK_STYLE} stroke="#2e2e2e" width={40} />
                  <Tooltip
                    {...TOOLTIP_STYLE}
                    labelFormatter={formatWeekTick}
                  />
                  <Legend verticalAlign="bottom" wrapperStyle={LEGEND_STYLE} />
                  {MOVEMENTS.map(m => (
                    <Bar key={m} dataKey={m} name={m} fill={MOVEMENT_COLORS[m]}>
                      <LabelList
                        dataKey={m}
                        position="top"
                        formatter={v => (v > 0 ? v : '')}
                        style={labelListStyle(m)}
                      />
                    </Bar>
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="charts-section">
          <h2 className="charts-section-title">Cumulative Volume</h2>
          {loading && <p className="charts-status">Loading…</p>}
          {error && <p className="charts-status charts-status--error">{error}</p>}
          {cumDisplayData && cumDisplayData.length > 0 && (
            <div className="charts-chart-wrap">
              <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                <BarChart
                  data={cumDisplayData}
                  margin={{ top: 16, right: 12, left: 0, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#2e2e2e" />
                  <XAxis
                    dataKey="week"
                    tickFormatter={formatWeekTick}
                    interval={Math.max(
                      0,
                      Math.ceil(cumDisplayData.length / MAX_VISIBLE_TICKS) - 1,
                    )}
                    tick={TICK_STYLE}
                    stroke="#2e2e2e"
                  />
                  <YAxis tick={TICK_STYLE} stroke="#2e2e2e" width={40} />
                  <Tooltip
                    {...TOOLTIP_STYLE}
                    labelFormatter={formatWeekTick}
                  />
                  <Legend verticalAlign="bottom" wrapperStyle={LEGEND_STYLE} />
                  {MOVEMENTS.map(m => (
                    <Bar key={m} dataKey={m} name={m} fill={MOVEMENT_COLORS[m]}>
                      <LabelList
                        dataKey={m}
                        position="top"
                        formatter={v => (v > 0 ? v : '')}
                        style={labelListStyle(m)}
                      />
                    </Bar>
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
