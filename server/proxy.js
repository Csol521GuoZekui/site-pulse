'use strict';

const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');
const { spawn } = require('child_process');
const cfg = require('./config');

const children = [];
let subContent = null;

function log(...args) {
  console.log('[site-pulse]', ...args);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function which(bin) {
  const candidates = [];
  if (path.isAbsolute(bin) || bin.includes('/') || bin.includes('\\')) {
    candidates.push(bin);
  } else {
    const dirs = (process.env.PATH || '').split(path.delimiter);
    const ext = process.platform === 'win32' ? ['.exe', ''] : [''];
    for (const d of dirs) {
      for (const e of ext) candidates.push(path.join(d, bin + e));
    }
    candidates.push(`/usr/local/bin/${bin}`, `/usr/bin/${bin}`);
  }
  for (const c of candidates) {
    try {
      if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
    } catch (_) {}
  }
  return bin;
}

function spawnManaged(bin, args, opts = {}) {
  const resolved = which(bin);
  log(`spawn: ${resolved} ${args.join(' ')}`);
  const child = spawn(resolved, args, {
    stdio: opts.stdio || 'ignore',
    env: process.env,
    cwd: cfg.FILE_PATH,
    ...opts,
  });
  child.on('exit', (code, signal) => {
    log(`${path.basename(resolved)} exited code=${code} signal=${signal}`);
  });
  child.on('error', (err) => {
    log(`${path.basename(resolved)} error: ${err.message}`);
  });
  children.push(child);
  return child;
}

function writeXrayConfig() {
  const config = {
    log: { access: 'none', error: 'none', loglevel: 'warning' },
    inbounds: [
      {
        tag: 'vless-ws-in',
        listen: '127.0.0.1',
        port: cfg.ARGO_PORT,
        protocol: 'vless',
        settings: {
          clients: [{ id: cfg.UUID, level: 0 }],
          decryption: 'none',
        },
        streamSettings: {
          network: 'ws',
          security: 'none',
          wsSettings: { path: cfg.WS_PATH },
        },
        sniffing: {
          enabled: true,
          destOverride: ['http', 'tls', 'quic'],
          metadataOnly: false,
        },
      },
    ],
    dns: { servers: ['https+local://8.8.8.8/dns-query'] },
    outbounds: [
      { protocol: 'freedom', tag: 'direct' },
      { protocol: 'blackhole', tag: 'block' },
    ],
  };
  fs.writeFileSync(cfg.paths.config, JSON.stringify(config, null, 2));
  log(`xray config written: ${cfg.paths.config}`);
}

function prepareFixedTunnel() {
  if (!cfg.ARGO_AUTH || !cfg.ARGO_DOMAIN) {
    log('ARGO_DOMAIN/ARGO_AUTH empty → quick tunnel');
    return 'quick';
  }
  if (cfg.ARGO_AUTH.includes('TunnelSecret')) {
    fs.writeFileSync(cfg.paths.tunnelJson, cfg.ARGO_AUTH);
    const tunnelId = (() => {
      try {
        return JSON.parse(cfg.ARGO_AUTH).TunnelID;
      } catch (_) {
        const m = cfg.ARGO_AUTH.match(/"TunnelID"\s*:\s*"([^"]+)"/);
        return m ? m[1] : '';
      }
    })();
    const yml = [
      `tunnel: ${tunnelId}`,
      `credentials-file: ${cfg.paths.tunnelJson}`,
      'protocol: http2',
      'ingress:',
      `  - hostname: ${cfg.ARGO_DOMAIN}`,
      `    service: http://127.0.0.1:${cfg.ARGO_PORT}`,
      '    originRequest:',
      '      noTLSVerify: true',
      '  - service: http_status:404',
      '',
    ].join('\n');
    fs.writeFileSync(cfg.paths.tunnelYml, yml);
    log(`fixed tunnel (json) → ${cfg.ARGO_DOMAIN}`);
    return 'json';
  }
  if (
    /^[A-Z0-9a-z=]{120,250}$/.test(cfg.ARGO_AUTH) ||
    /^eyJ[A-Za-z0-9._=-]+$/.test(cfg.ARGO_AUTH)
  ) {
    log(
      `fixed tunnel (token) → ${cfg.ARGO_DOMAIN}; ensure CF dashboard service=http://127.0.0.1:${cfg.ARGO_PORT}`
    );
    return 'token';
  }
  log('ARGO_AUTH unrecognized → quick tunnel');
  return 'quick';
}

function startXray() {
  return spawnManaged(cfg.XRAY_BIN, ['-c', cfg.paths.config]);
}

function startCloudflared(mode) {
  if (fs.existsSync(cfg.paths.bootLog)) {
    try {
      fs.unlinkSync(cfg.paths.bootLog);
    } catch (_) {}
  }

  let args;
  if (mode === 'token') {
    args = [
      'tunnel',
      '--edge-ip-version', 'auto',
      '--no-autoupdate',
      '--protocol', 'http2',
      'run',
      '--token', cfg.ARGO_AUTH,
    ];
  } else if (mode === 'json') {
    args = [
      'tunnel',
      '--edge-ip-version', 'auto',
      '--no-autoupdate',
      '--config', cfg.paths.tunnelYml,
      'run',
    ];
  } else {
    args = [
      'tunnel',
      '--edge-ip-version', 'auto',
      '--no-autoupdate',
      '--protocol', 'http2',
      '--logfile', cfg.paths.bootLog,
      '--loglevel', 'info',
      '--url', `http://127.0.0.1:${cfg.ARGO_PORT}`,
    ];
  }
  return spawnManaged(cfg.CLOUDFLARED_BIN, args);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForQuickTunnelDomain(timeoutMs = 45000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if (fs.existsSync(cfg.paths.bootLog)) {
        const content = fs.readFileSync(cfg.paths.bootLog, 'utf8');
        const m = content.match(/https?:\/\/([a-z0-9-]+\.trycloudflare\.com)/i);
        if (m) return m[1];
      }
    } catch (_) {}
    await sleep(1000);
  }
  throw new Error('quick tunnel domain not found in cloudflared log');
}

function buildSubscription(argoDomain) {
  const remark = encodeURIComponent(cfg.NAME);
  const pathEnc = encodeURIComponent(`${cfg.WS_PATH}?ed=2560`);
  const link =
    `vless://${cfg.UUID}@${cfg.CFIP}:${cfg.CFPORT}` +
    `?encryption=none&security=tls&sni=${argoDomain}&fp=chrome` +
    `&type=ws&host=${argoDomain}&path=${pathEnc}` +
    `#${remark}`;

  const plain = link + '\n';
  const b64 = Buffer.from(plain).toString('base64');
  fs.writeFileSync(cfg.paths.list, plain, 'utf8');
  fs.writeFileSync(cfg.paths.sub, b64, 'utf8');
  subContent = b64;
  log('subscription ready');
  log(plain.trim());
  return b64;
}

function getSubscription() {
  if (subContent) return subContent;
  if (fs.existsSync(cfg.paths.sub)) {
    subContent = fs.readFileSync(cfg.paths.sub, 'utf8');
    return subContent;
  }
  return '';
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { timeout: 15000 }, (res) => {
      res.resume();
      resolve(res.statusCode);
    });
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('timeout'));
    });
    req.on('error', reject);
  });
}

function startKeepAlive() {
  if (!cfg.AUTO_ACCESS || !cfg.PROJECT_URL) {
    log('keep-alive skipped (set AUTO_ACCESS=true and PROJECT_URL)');
    return;
  }
  const tick = async () => {
    try {
      const code = await httpGet(cfg.PROJECT_URL);
      log(`keep-alive GET ${cfg.PROJECT_URL} → ${code}`);
    } catch (err) {
      log(`keep-alive failed: ${err.message}`);
    }
  };
  log(`keep-alive every ${cfg.KEEP_ALIVE_INTERVAL_MS}ms → ${cfg.PROJECT_URL}`);
  tick();
  setInterval(tick, cfg.KEEP_ALIVE_INTERVAL_MS);
}

function shutdown() {
  log('shutting down…');
  for (const c of children) {
    try {
      c.kill('SIGTERM');
    } catch (_) {}
  }
  setTimeout(() => process.exit(0), 500);
}

async function startProxy() {
  ensureDir(cfg.FILE_PATH);
  log(`UUID=${cfg.UUID}`);
  log(`FILE_PATH=${cfg.FILE_PATH}`);

  writeXrayConfig();
  const tunnelMode = prepareFixedTunnel();

  startXray();
  await sleep(800);

  startCloudflared(tunnelMode);
  await sleep(1500);

  let domain;
  if (tunnelMode === 'quick') {
    domain = await waitForQuickTunnelDomain();
    log(`quick tunnel domain: ${domain}`);
  } else {
    domain = cfg.ARGO_DOMAIN;
    log(`fixed tunnel domain: ${domain}`);
  }

  buildSubscription(domain);
  startKeepAlive();
  return { domain };
}

module.exports = {
  log,
  startProxy,
  getSubscription,
  shutdown,
};
