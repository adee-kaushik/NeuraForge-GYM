/**
 * ADMS relay: lets a biometric machine that can only speak plain HTTP (no HTTPS option) reach NeuraFitness.
 *
 * Why: the site only accepts HTTPS and redirects plain HTTP, and most machines cannot follow that redirect,
 * so they silently fail. This tiny forwarder accepts the machine's plain HTTP and passes it on over HTTPS.
 * It stores nothing and needs no packages, only Node.js 18+.
 *
 * Run it on any always-on computer the machine can reach (a PC at the gym, a Raspberry Pi, a small server):
 *   TARGET_URL=https://your-site.com PORT=8080 node adms-relay.js
 *
 * Then on the machine set Server Address = that computer's IP, Server Port = 8080, HTTPS = OFF.
 * (Port 80 also works if you run it with permission to use it.)
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

const TARGET = new URL(process.env.TARGET_URL || '');
const PORT = parseInt(process.env.PORT || '8080', 10);
const client = TARGET.protocol === 'https:' ? https : http;

const server = http.createServer((req, res) => {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const body = Buffer.concat(chunks);
    const headers = { ...req.headers, host: TARGET.host, 'content-length': body.length };
    delete headers.connection;

    const upstream = client.request(
      { protocol: TARGET.protocol, hostname: TARGET.hostname, port: TARGET.port || undefined, method: req.method, path: req.url, headers, timeout: 20000 },
      (up) => {
        const out = [];
        up.on('data', (c) => out.push(c));
        up.on('end', () => {
          const data = Buffer.concat(out);
          // The machine reads these replies as plain text; do not let a proxy add chunking or compression.
          res.writeHead(up.statusCode || 502, { 'Content-Type': up.headers['content-type'] || 'text/plain', 'Content-Length': data.length });
          res.end(data);
          console.log(`${new Date().toISOString()} ${req.method} ${req.url.split('?')[0]} -> ${up.statusCode} (${body.length} bytes in)`);
        });
      }
    );
    upstream.on('timeout', () => upstream.destroy(new Error('timeout')));
    upstream.on('error', (err) => {
      // A failure reply makes the machine keep its punches and try again later, which is exactly what we want.
      console.log(`${new Date().toISOString()} ${req.method} ${req.url.split('?')[0]} -> FAILED (${err.message})`);
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end('ERROR: relay could not reach server');
    });
    upstream.end(body);
  });
});

if (!process.env.TARGET_URL) {
  console.error('Set TARGET_URL, for example: TARGET_URL=https://your-site.com PORT=8080 node adms-relay.js');
  process.exit(1);
}
server.listen(PORT, () => console.log(`ADMS relay listening on port ${PORT}, forwarding to ${TARGET.origin}`));
