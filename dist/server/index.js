const SIGNATURES = 'SELECT slot, sequence, name, hero FROM signatures ORDER BY slot';
const SIGN = `
  INSERT INTO signatures (slot, sequence, token, name, hero)
  SELECT COALESCE(MAX(sequence), 0) % 100, COALESCE(MAX(sequence), 0) + 1, ?1, ?2, ?3
  FROM signatures
  HAVING NOT EXISTS (SELECT 1 FROM signatures WHERE token = ?1)
  ON CONFLICT(slot) DO UPDATE SET sequence = excluded.sequence, token = excluded.token,
    name = excluded.name, hero = excluded.hero
`;

function json(value, status = 200) {
  return Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
}

async function sign(request, db) {
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) return json({ error: 'Sign from Doomwatch.' }, 403);
  if (request.headers.get('Content-Type')?.split(';')[0] !== 'application/json') {
    return json({ error: 'Expected a JSON signature.' }, 415);
  }
  if (Number(request.headers.get('Content-Length')) > 1024) return json({ error: 'Signature is too long.' }, 413);

  let entry;
  try {
    const body = await request.text();
    if (body.length > 1024) return json({ error: 'Signature is too long.' }, 413);
    entry = JSON.parse(body);
  } catch {
    return json({ error: 'Signature could not be read.' }, 400);
  }
  const name = typeof entry?.name === 'string' ? entry.name.trim() : '';
  const hero = entry?.hero;
  const token = entry?.token;
  if (!name || name.length > 24 || /[\u0000-\u001f\u007f]/u.test(name) ||
      !Number.isInteger(hero) || hero < 0 || hero >= 12 ||
      typeof token !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(token)) {
    return json({ error: 'A display name and hero are required.' }, 400);
  }
  const [, { results }] = await db.batch([db.prepare(SIGN).bind(token, name, hero), db.prepare(SIGNATURES)]);
  return json({ signatures: results });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/api/signatures') return env.ASSETS.fetch(request);

    try {
      if (request.method === 'GET') {
        const { results } = await env.DB.prepare(SIGNATURES).all();
        return json({ signatures: results });
      }
      if (request.method === 'POST') return await sign(request, env.DB);
      return json({ error: 'Method unavailable.' }, 405);
    } catch (error) {
      console.error('Signature wall request failed', error);
      return json({ error: 'The signature wall is temporarily unavailable.' }, 503);
    }
  }
};
