// Designer OS — Notion CORS Proxy (Vercel Serverless Function)
// Deploy this to Vercel/Cloudflare so the browser can talk to api.notion.com
// (Notion API blocks direct browser requests via CORS).
//
// Usage:
//   1. Deploy this repo to Vercel
//   2. In Designer OS settings, set notionProxyUrl to:
//      https://YOUR-DEPLOYMENT.vercel.app/api/notion-proxy
//   3. Notion sync now works through this proxy.
//
// Path forwarding: the proxy mirrors the Notion API path 1:1.
//   Browser calls:  /api/notion-proxy/databases/{id}/query
//   Proxy forwards: https://api.notion.com/v1/databases/{id}/query

export default async function handler(req, res) {
  // CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Notion-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Strip "/api/notion-proxy" prefix to get the path Notion expects
    const url = new URL(req.url, 'http://localhost');
    let path = url.pathname.replace(/^\/api\/notion-proxy/, '');
    if (!path) path = '/';
    const targetUrl = 'https://api.notion.com/v1' + path + (url.search || '');

    // Forward headers (auth + Notion-Version + content-type)
    const headers = {};
    for (const h of ['authorization', 'notion-version', 'content-type']) {
      if (req.headers[h]) headers[h] = req.headers[h];
    }
    if (!headers['notion-version']) headers['notion-version'] = '2022-06-28';

    // Body (for non-GET)
    let body;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      // Vercel parses JSON body automatically; re-stringify it
      body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
    }

    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers,
      body
    });

    const text = await upstream.text();
    res.status(upstream.status);
    const contentType = upstream.headers.get('content-type') || 'application/json';
    res.setHeader('Content-Type', contentType);
    res.send(text);
  } catch (err) {
    res.status(500).json({ error: 'proxy_error', message: err.message });
  }
}

// Vercel config — disable body-parsing to forward raw JSON
export const config = {
  api: {
    bodyParser: { sizeLimit: '1mb' }
  }
};
