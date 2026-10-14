'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const cfg = require('./config');
const { getSubscription, log } = require('./proxy');

function clientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim();
  if (req.headers['x-real-ip']) return String(req.headers['x-real-ip']).trim();
  if (req.headers['cf-connecting-ip']) return String(req.headers['cf-connecting-ip']).trim();
  let ip = req.socket && req.socket.remoteAddress ? req.socket.remoteAddress : '';
  if (ip.startsWith('::ffff:')) ip = ip.slice(7);
  return ip;
}

function safeHeaders(req) {
  const deny = new Set([
    'cookie',
    'authorization',
    'proxy-authorization',
    'x-api-key',
    'set-cookie',
  ]);
  const out = {};
  for (const [k, v] of Object.entries(req.headers || {})) {
    if (deny.has(String(k).toLowerCase())) continue;
    out[k] = Array.isArray(v) ? v.join(', ') : v;
  }
  return out;
}

function sendJson(res, code, obj) {
  const body = JSON.stringify(obj, null, 2);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(body);
}

function buildSite() {
  return {
    name: cfg.SITE_NAME,
    tagline: cfg.SITE_TAGLINE,
    time: new Date().toISOString(),
  };
}

function buildIp(req) {
  return {
    ip: clientIp(req),
    method: req.method,
    time: new Date().toISOString(),
  };
}

function buildPing() {
  return {
    pong: true,
    time: new Date().toISOString(),
    mono_ms: Number(process.hrtime.bigint() / 1000000n),
  };
}

function buildHeaders(req) {
  return {
    ip: clientIp(req),
    headers: safeHeaders(req),
    time: new Date().toISOString(),
  };
}

function buildStatus() {
  return {
    status: 'operational',
    service: cfg.SITE_NAME,
    uptime_sec: Math.round(process.uptime()),
    time: new Date().toISOString(),
  };
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.map': 'application/json; charset=utf-8',
  };
  return map[ext] || 'application/octet-stream';
}

function safeJoin(root, urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0] || '/');
  const cleaned = path.normalize(decoded).replace(/^(\.\.[/\\])+/, '');
  const full = path.join(root, cleaned);
  if (!full.startsWith(path.resolve(root))) return null;
  return full;
}

function sendFile(res, filePath) {
  const data = fs.readFileSync(filePath);
  res.writeHead(200, {
    'Content-Type': contentType(filePath),
    'Cache-Control': filePath.endsWith('.html') ? 'no-store' : 'public, max-age=86400',
  });
  res.end(data);
}

function serveSpa(res) {
  const indexFile = path.join(cfg.WEB_DIST, 'index.html');
  if (!fs.existsSync(indexFile)) {
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('frontend not built');
    return;
  }
  sendFile(res, indexFile);
}

function startHttpServer() {
  const distReady = fs.existsSync(path.join(cfg.WEB_DIST, 'index.html'));
  log(`WEB_DIST=${cfg.WEB_DIST} ready=${distReady}`);

  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0] || '/');

    if (urlPath === `/${cfg.SUB_PATH}`) {
      const body = getSubscription();
      if (body) {
        res.writeHead(200, {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-store',
        });
        res.end(body);
        return;
      }
      serveSpa(res);
      return;
    }

    if (urlPath === '/health' || urlPath === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('ok');
      return;
    }

    if (urlPath === '/api/site') {
      sendJson(res, 200, buildSite());
      return;
    }

    if (urlPath === '/api/ip') {
      sendJson(res, 200, buildIp(req));
      return;
    }

    if (urlPath === '/api/ping') {
      sendJson(res, 200, buildPing());
      return;
    }

    if (urlPath === '/api/headers') {
      sendJson(res, 200, buildHeaders(req));
      return;
    }

    if (urlPath === '/api/status') {
      sendJson(res, 200, buildStatus());
      return;
    }

    if (urlPath === '/api/all') {
      sendJson(res, 200, {
        site: buildSite(),
        ip: buildIp(req),
        ping: buildPing(),
        headers: buildHeaders(req),
        status: buildStatus(),
      });
      return;
    }

    if (urlPath === '/' || urlPath === '/index.html') {
      serveSpa(res);
      return;
    }

    const filePath = safeJoin(cfg.WEB_DIST, urlPath);
    if (filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      sendFile(res, filePath);
      return;
    }

    // SPA fallback for client-side routes
    // SPA 客户端路由回退到首页
    if (!urlPath.startsWith('/api/')) {
      serveSpa(res);
      return;
    }

    sendJson(res, 404, { error: 'not found' });
  });

  server.listen(cfg.PORT, () => log(`http listening on :${cfg.PORT}`));
  return server;
}

module.exports = { startHttpServer };
