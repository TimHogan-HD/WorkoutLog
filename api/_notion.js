// Shared Notion API helper for server-side use only (Notion API 2025-09-03).
const NOTION_VERSION = '2025-09-03';
const BASE_URL = 'https://api.notion.com/v1';

export function notionHeaders() {
  return {
    Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json',
  };
}

async function notionFetch(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: notionHeaders(),
    body: JSON.stringify(body ?? {}),
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const msg =
      data?.message ||
      data?.error ||
      `Notion request failed (${res.status})`;
    throw new Error(`${msg} [${path}]`);
  }

  return data;
}

/**
 * Query a DATA SOURCE (new API), not a database.
 */
export async function notionQuery(dataSourceId, body = {}, cursor = null) {
  const payload = { ...body };
  if (cursor) payload.start_cursor = cursor;

  return notionFetch(`/data-sources/${dataSourceId}/query`, payload);
}

export async function notionQueryAll(dataSourceId, body = {}) {
  const results = [];
  let cursor = null;
  let hasMore = true;

  while (hasMore) {
    const data = await notionQuery(dataSourceId, body, cursor);
    results.push(...(data.results || []));
    hasMore = !!data.has_more;
    cursor = data.next_cursor;
  }

  return results;
}

/**
 * Create page in a DATA SOURCE (new API).
 */
export async function notionCreate(parentDataSourceId, properties) {
  return notionFetch(`/pages`, {
    parent: { data_source_id: parentDataSourceId },
    properties,
  });
}

// ── Property access helpers ───────────────────────────────────────────────

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
