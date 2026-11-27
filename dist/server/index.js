const SIGNATURES = 'SELECT slot, sequence, name, hero, earth FROM signatures ORDER BY slot';
const CHECKPOINT = 'SELECT sequence FROM signature_wall_checkpoint WHERE id = 1';
const VISITOR = 'SELECT sequence FROM signature_visitors WHERE visitor = ?';
const REMEMBER = `
  INSERT INTO signature_visitors (visitor, sequence)
  SELECT token, sequence FROM signatures WHERE token = ?1
  ON CONFLICT(visitor) DO NOTHING
`;
const COOKIE = '__Host-doomwatch-wall';
const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
const SIGN = `
  INSERT INTO signatures (slot, sequence, token, name, hero, earth)
  SELECT (COALESCE(latest.sequence, checkpoint.sequence) - checkpoint.sequence) % 100,
    COALESCE(latest.sequence, checkpoint.sequence) + 1, ?1, ?2, ?3, 100 + abs(random() % 900)
  FROM signature_wall_checkpoint AS checkpoint
  CROSS JOIN (SELECT MAX(sequence) AS sequence FROM signatures) AS latest
  WHERE checkpoint.id = 1 AND NOT EXISTS (SELECT 1 FROM signature_visitors WHERE visitor = ?1)
  ON CONFLICT(slot) DO UPDATE SET sequence = excluded.sequence, token = excluded.token,
    name = excluded.name, hero = excluded.hero, earth = excluded.earth
`;

function json(value, status = 200, headers = {}) {
  return Response.json(value, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
}

function wallVisitor(request) {
  const cookies = request.headers.get('Cookie')?.split(';') ?? [];
  const value = cookies.map(cookie => cookie.trim())
    .find(cookie => cookie.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1);
  return UUID.test(value ?? '') ? value : null;
}

async function readWall(request, db) {
  const visitor = wallVisitor(request);
  if (!visitor) {
    const [{ results }, { results: [checkpoint] }] = await db.batch([db.prepare(SIGNATURES), db.prepare(CHECKPOINT)]);
    return json({ signatures: results, signed: false, signedSequence: null, checkpoint: checkpoint.sequence }, 200, {
      'Set-Cookie': COOKIE + '=' + crypto.randomUUID() + '; Max-Age=34560000; Path=/; Secure; HttpOnly; SameSite=Lax'
    });
  }
  const [{ results }, { results: matches }, { results: [checkpoint] }] = await db.batch([
    db.prepare(SIGNATURES), db.prepare(VISITOR).bind(visitor), db.prepare(CHECKPOINT)
  ]);
  const signedSequence = matches[0]?.sequence ?? null;
  return json({ signatures: results, signed: signedSequence !== null, signedSequence, checkpoint: checkpoint.sequence });
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
  if (!name || name.length > 24 || /[\u0000-\u001f\u007f]/u.test(name) ||
      !Number.isInteger(hero) || hero < 0 || hero >= 12) {
    return json({ error: 'A display name and hero are required.' }, 400);
  }
  const visitor = wallVisitor(request);
  if (!visitor) return json({ error: 'Load the wall and enable cookies before signing.' }, 409);
  const [, , { results }, { results: [checkpoint] }, { results: [signature] }] = await db.batch([
    db.prepare(SIGN).bind(visitor, name, hero),
    db.prepare(REMEMBER).bind(visitor),
    db.prepare(SIGNATURES), db.prepare(CHECKPOINT), db.prepare(VISITOR).bind(visitor)
  ]);
  return json({ signatures: results, signed: true, signedSequence: signature.sequence, checkpoint: checkpoint.sequence });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/api/signatures') return env.ASSETS.fetch(request);

    try {
      if (request.method === 'GET') {
        return await readWall(request, env.DB);
      }
      if (request.method === 'POST') return await sign(request, env.DB);
      return json({ error: 'Method unavailable.' }, 405);
    } catch (error) {
      console.error('Signature wall request failed', error);
      return json({ error: 'The signature wall is temporarily unavailable.' }, 503);
    }
  }
};
