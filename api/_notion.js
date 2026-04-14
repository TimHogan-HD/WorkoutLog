// Shared Notion API helper for server-side use only.
const NOTION_VERSION = '2022-06-28';
const BASE_URL = 'https://api.notion.com/v1';

export function notionHeaders() {
  return {
    Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json',
  };
}

export async function notionQuery(databaseId, body = {}, cursor = null) {
  const payload = { ...body };
  if (cursor) payload.start_cursor = cursor;

  const res = await fetch(`${BASE_URL}/databases/${databaseId}/query`, {
    method: 'POST',
    headers: notionHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Notion query failed (${res.status}): ${text}`);
  }

  return res.json();
}

export async function notionQueryAll(databaseId, body = {}) {
  const results = [];
  let cursor = null;
  let hasMore = true;

  while (hasMore) {
    const data = await notionQuery(databaseId, body, cursor);
    results.push(...(data.results || []));
    hasMore = data.has_more;
    cursor = data.next_cursor;
  }

  return results;
}

export async function notionCreate(parentDatabaseId, properties) {
  const res = await fetch(`${BASE_URL}/pages`, {
    method: 'POST',
    headers: notionHeaders(),
    body: JSON.stringify({
      parent: { database_id: parentDatabaseId },
      properties,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Notion create failed (${res.status}): ${text}`);
  }

  return res.json();
}

// ── Property access helpers ──────────────────────────────────────────────────

export function getSelect(props, key) {
  return props?.[key]?.select?.name ?? null;
}

export function getMultiSelect(props, key) {
  return (props?.[key]?.multi_select ?? []).map((s) => s.name);
}

export function getNumber(props, key) {
  return props?.[key]?.number ?? null;
}

export function getRichText(props, key) {
  return (props?.[key]?.rich_text ?? []).map((t) => t.plain_text).join('');
}

export function getTitle(props, key) {
  return (props?.[key]?.title ?? []).map((t) => t.plain_text).join('');
}

export function getDate(props, key) {
  return props?.[key]?.date?.start ?? null;
}
