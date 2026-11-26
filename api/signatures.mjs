const upstream = 'https://doomwatch-readiness.cleverechidna16.chatgpt.site/api/signatures';
const wallCookie = '__Host-doomwatch-wall=';

export default async function handler(request, response) {
  const { method, headers } = request;
  response.setHeader('Cache-Control', 'no-store');
  if (method !== 'GET' && method !== 'POST') {
    response.setHeader('Allow', 'GET, POST');
    return response.status(405).json({ error: 'Method unavailable.' });
  }
  const forwarded = new Headers();
  const cookie = headers.cookie?.split(';').map(value => value.trim()).find(value => value.startsWith(wallCookie));
  if (cookie && /^__Host-doomwatch-wall=[0-9a-f-]{36}$/.test(cookie)) forwarded.set('Cookie', cookie);
  let body;
  if (method === 'POST') {
    try {
      if (headers.origin && new URL(headers.origin).host !== headers.host) {
        return response.status(403).json({ error: 'Sign from Doomwatch.' });
      }
    } catch {
      return response.status(403).json({ error: 'Sign from Doomwatch.' });
    }
    if (headers['content-type']?.split(';')[0] !== 'application/json') {
      return response.status(415).json({ error: 'Expected a JSON signature.' });
    }
    body = typeof request.body === 'string' ? request.body : JSON.stringify(request.body);
    if (!body || Buffer.byteLength(body, 'utf8') > 1024) {
      return response.status(body ? 413 : 400).json({ error: body ? 'Signature is too long.' : 'Signature could not be read.' });
    }
    forwarded.set('Content-Type', 'application/json');
    forwarded.set('Origin', new URL(upstream).origin);
  }
  try {
    const result = await fetch(upstream, {
      method, headers: forwarded, body, redirect: 'error', signal: AbortSignal.timeout(8000)
    });
    const setCookie = result.headers.getSetCookie().find(value => value.startsWith(wallCookie));
    if (setCookie) response.setHeader('Set-Cookie', setCookie);
    const payload = await result.json();
    return response.status(result.status).json(payload);
  } catch {
    return response.status(503).json({ error: 'The signature wall is temporarily unavailable.' });
  }
}
