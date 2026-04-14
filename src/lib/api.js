// Client-side API calls — talks only to /api/* routes, never directly to Notion.

export async function fetchBootstrap() {
  const res = await fetch('/api/bootstrap');
  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.error || `Bootstrap failed (${res.status})`);
  }
  return data; // { library, history }
}

export async function postLog(payload) {
  const res = await fetch('/api/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.error || `Log failed (${res.status})`);
  }
  return data;
}
