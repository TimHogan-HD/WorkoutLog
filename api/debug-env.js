export default function handler(req, res) {
  const raw = process.env.NOTION_API_KEY || '';

  return res.status(200).json({
    hasKey: !!raw,
    length: raw.length,
    prefix: raw.slice(0, 6),
    suffix: raw.slice(-4),
  });
}
