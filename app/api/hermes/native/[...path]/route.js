export const dynamic = "force-dynamic";

const HERMES_DASHBOARD_BASE_URL = "http://127.0.0.1:9119";

let cachedToken = "";
let cachedTokenAt = 0;

async function getHermesSessionToken(baseUrl) {
  const now = Date.now();

  if (cachedToken && now - cachedTokenAt < 60 * 1000) {
    return cachedToken;
  }

  const res = await fetch(baseUrl + "/", {
    cache: "no-store",
  });

  if (!res.ok) {
    return "";
  }

  const html = await res.text();

  const patterns = [
    /window\.__HERMES_SESSION_TOKEN__\s*=\s*["']([^"']+)["']/,
    /__HERMES_SESSION_TOKEN__["']?\s*:\s*["']([^"']+)["']/,
    /__HERMES_SESSION_TOKEN__[^A-Za-z0-9_-]+([A-Za-z0-9_.\-]+)/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);

    if (match?.[1]) {
      cachedToken = match[1];
      cachedTokenAt = now;
      return cachedToken;
    }
  }

  return "";
}

async function proxyHermes(request, context) {
  try {
    const params = await Promise.resolve(context?.params || {});
    const rawPath = params?.path || [];
    const pathParts = Array.isArray(rawPath) ? rawPath : [rawPath];
    const pathname = pathParts.map(encodeURIComponent).join("/");

    const incomingUrl = new URL(request.url);
    const targetUrl = new URL("/api/" + pathname, HERMES_DASHBOARD_BASE_URL);
    targetUrl.search = incomingUrl.search;

    const headers = new Headers(request.headers);
    headers.delete("host");
    headers.delete("connection");
    headers.delete("content-length");

    let sessionToken = request.headers.get("x-hermes-session-token");

    if (!sessionToken) {
      sessionToken = await getHermesSessionToken(HERMES_DASHBOARD_BASE_URL);
    }

    if (sessionToken) {
      headers.set("x-hermes-session-token", sessionToken);
    }

    const init = {
      method: request.method,
      headers,
      cache: "no-store",
    };

    if (!["GET", "HEAD"].includes(request.method)) {
      init.body = await request.arrayBuffer();
    }

    const upstream = await fetch(targetUrl.toString(), init);

    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("transfer-encoding");
    responseHeaders.delete("connection");
    responseHeaders.set("x-mamabot-hermes-target", targetUrl.toString());
    responseHeaders.set("x-mamabot-hermes-token", sessionToken ? "attached" : "missing");

    return new Response(await upstream.arrayBuffer(), {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error?.message || String(error),
        targetBaseUrl: HERMES_DASHBOARD_BASE_URL,
      },
      { status: 500 }
    );
  }
}

export async function GET(request, context) {
  return proxyHermes(request, context);
}

export async function POST(request, context) {
  return proxyHermes(request, context);
}

export async function PUT(request, context) {
  return proxyHermes(request, context);
}

export async function PATCH(request, context) {
  return proxyHermes(request, context);
}

export async function DELETE(request, context) {
  return proxyHermes(request, context);
}
