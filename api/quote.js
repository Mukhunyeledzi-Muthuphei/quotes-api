const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ-SzdfKpNRkOW6A-DwBTjtF38duTVd80oMgvoHMFUpvAloX5Th0JP-QwIaYEJMiQDxZZPnp8iYr_pz/pub?gid=0&single=true&output=csv";

/**
 * Parse a single CSV line into fields, respecting double-quoted fields that
 * may contain commas or escaped quotes ("").
 */
function parseCsvLine(line) {
  const fields = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      fields.push(field.trim());
      field = '';
    } else {
      field += ch;
    }
  }
  fields.push(field.trim());
  return fields;
}

export default async function handler(req, res) {
  // 1. Fetch the published Google Sheet CSV
  let response;
  try {
    response = await fetch(SHEET_CSV_URL);
  } catch (err) {
    return res.status(502).json({ error: "Failed to reach the quotes source." });
  }

  if (!response.ok) {
    return res.status(502).json({ error: `Quotes source returned status ${response.status}.` });
  }

  const csvText = await response.text();

  // 2. Parse the CSV lines, skipping the header row
  const lines = csvText.split('\n').slice(1).filter(line => line.trim() !== '');

  if (lines.length === 0) {
    return res.status(404).json({ error: "No quotes available." });
  }

  // 3. Pick a random row
  const randomLine = lines[Math.floor(Math.random() * lines.length)];
  const fields = parseCsvLine(randomLine);
  const text = fields[0] || '';
  const author = fields[1];

  // 4. Return as JSON
  res.setHeader('Cache-Control', 's-maxage=1, stale-while-revalidate');
  res.status(200).json({
    quote: text,
    author: author || "Unknown"
  });
}
