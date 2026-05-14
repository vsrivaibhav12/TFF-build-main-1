/**
 * Frontend port-3000 proxy.
 *
 * The K8s ingress routes browser traffic for `/*` (non-/api) directly to
 * port 3000. Some ingress paths set `x-forwarded-host` to a different
 * domain than the browser's `Origin`, which trips Next.js Server Actions
 * CSRF protection. This tiny proxy strips both `x-forwarded-host` and
 * `host` so Next.js falls back to its own request.url-based host check
 * and the action succeeds.
 *
 * In production (Vercel) this proxy is NOT used.
 */
const http = require('http');
const { spawn } = require('child_process');

const TARGET_PORT = 3001;
const LISTEN_PORT = 3000;

// Spawn Next.js dev on TARGET_PORT
const next = spawn(
  'node',
  ['/app/node_modules/.bin/next', 'dev', '-p', String(TARGET_PORT), '-H', '127.0.0.1'],
  {
    cwd: '/app',
    env: { ...process.env, PORT: String(TARGET_PORT) },
    stdio: 'inherit',
  }
);
next.on('exit', (code) => {
  console.log(`[frontend] next exited with ${code}`);
  process.exit(code ?? 1);
});
process.on('SIGTERM', () => next.kill('SIGTERM'));
process.on('SIGINT', () => next.kill('SIGINT'));

// Proxy listening on LISTEN_PORT
const server = http.createServer((req, res) => {
  const headers = { ...req.headers };
  // Compute origin's host and force x-forwarded-host to match. This satisfies
  // Next.js Server Actions CSRF protection which compares those two values.
  const origin = headers['origin'];
  let forwardHost = '';
  if (origin && typeof origin === 'string') {
    try { forwardHost = new URL(origin).host; } catch {}
  }
  if (forwardHost) {
    headers['x-forwarded-host'] = forwardHost;
  } else {
    delete headers['x-forwarded-host'];
  }
  delete headers['x-forwarded-server'];
  delete headers['host'];
  const opts = {
    hostname: '127.0.0.1',
    port: TARGET_PORT,
    path: req.url,
    method: req.method,
    headers,
  };
  const proxyReq = http.request(opts, (pres) => {
    res.writeHead(pres.statusCode || 502, pres.headers);
    pres.pipe(res);
  });
  proxyReq.on('error', (err) => {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'proxy_error', message: err.message }));
  });
  req.pipe(proxyReq);
});

// Upgrade (websocket / HMR) passthrough
server.on('upgrade', (req, socket, head) => {
  const headers = { ...req.headers };
  delete headers['x-forwarded-host'];
  delete headers['x-forwarded-server'];
  delete headers['host'];
  const opts = {
    hostname: '127.0.0.1',
    port: TARGET_PORT,
    path: req.url,
    method: req.method,
    headers,
  };
  const proxyReq = http.request(opts);
  proxyReq.on('upgrade', (pres, pSocket) => {
    socket.write(
      `HTTP/1.1 ${pres.statusCode} ${pres.statusMessage}\r\n` +
        Object.entries(pres.headers)
          .map(([k, v]) => `${k}: ${v}`)
          .join('\r\n') +
        '\r\n\r\n'
    );
    pSocket.pipe(socket);
    socket.pipe(pSocket);
  });
  proxyReq.on('error', () => socket.destroy());
  proxyReq.end();
});

// Wait briefly for Next.js to bind, then start
setTimeout(() => {
  server.listen(LISTEN_PORT, '0.0.0.0', () => {
    console.log(`[frontend-proxy] :${LISTEN_PORT} -> :${TARGET_PORT}`);
  });
}, 1500);
