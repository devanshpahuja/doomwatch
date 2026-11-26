const upstream = new URL("https://doomwatch-readiness.cleverechidna16.chatgpt.site/api/signatures");
const wallCookieName = "__Host-doomwatch-wall=";

export const config = { path: "/api/signatures" };

function wallResponse(payload, status, headers = {}) {
  return Response.json(payload, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

export default async function signatures(request) {
  if (request.method !== "GET" && request.method !== "POST") {
    return wallResponse({ error: "Method unavailable." }, 405, { Allow: "GET, POST" });
  }

  const headers = new Headers();
  const cookie = request.headers.get("cookie")?.split(";").map(value => value.trim())
    .find(value => /^__Host-doomwatch-wall=[0-9a-f-]{36}$/.test(value));
  if (cookie) headers.set("Cookie", cookie);

  let body;
  if (request.method === "POST") {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) {
      return wallResponse({ error: "Sign from Doomwatch." }, 403);
    }
    if (request.headers.get("content-type")?.split(";")[0] !== "application/json") {
      return wallResponse({ error: "Expected a JSON signature." }, 415);
    }
    body = await request.arrayBuffer();
    if (body.byteLength === 0) return wallResponse({ error: "Signature could not be read." }, 400);
    if (body.byteLength > 1024) return wallResponse({ error: "Signature is too long." }, 413);
    headers.set("Content-Type", "application/json");
    headers.set("Origin", upstream.origin);
  }

  try {
    const response = await fetch(upstream, {
      method: request.method,
      headers,
      body,
      redirect: "error",
      signal: AbortSignal.timeout(8000)
    });
    const cookie = response.headers.getSetCookie().find(value => value.startsWith(wallCookieName));
    return wallResponse(await response.json(), response.status, cookie ? { "Set-Cookie": cookie } : {});
  } catch {
    return wallResponse({ error: "The signature wall is temporarily unavailable." }, 503);
  }
}
