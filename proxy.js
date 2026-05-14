/**
 * Tiny HTTP proxy for Emergent dev environment.
 * Supervisor expects a service on port 8001 for /api/* routes.
 * Next.js owns /api in-process on port 3000, so we forward 8001 -> 3000.
 * NOT used in production (Vercel). Dev-only.
 */
const http = require('http');

const TARGET_PORT = 3000;
const LISTEN_PORT = 8001;

const server = http.createServer((req, res) => {
  const opts = {
    hostname: '127.0.0.1',
    port: TARGET_PORT,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `127.0.0.1:${TARGET_PORT}` },
  };
  const proxyReq = http.request(opts, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
    proxyRes.pipe(res);
  });
  proxyReq.on('error', (err) => {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'proxy_error', message: err.message }));
  });
  req.pipe(proxyReq);
});

server.listen(LISTEN_PORT, '0.0.0.0', () => {
  console.log(`[proxy] :${LISTEN_PORT} -> :${TARGET_PORT}`);
});
