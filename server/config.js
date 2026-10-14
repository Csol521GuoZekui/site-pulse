'use strict';

const os = require('os');
const path = require('path');
const crypto = require('crypto');

const UUID = process.env.UUID || crypto.randomUUID();
const ARGO_DOMAIN = process.env.ARGO_DOMAIN || '';
const ARGO_AUTH = process.env.ARGO_AUTH || '';
const ARGO_PORT = parseInt(process.env.ARGO_PORT || '8001', 10);
const CFIP = process.env.CFIP || 'cdn.cloudflare.com';
const CFPORT = process.env.CFPORT || '443';
const PORT = parseInt(process.env.PORT || process.env.SERVER_PORT || '3000', 10);
const SUB_PATH = (process.env.SUB_PATH || 'sub').replace(/^\/+/, '');
const NAME = process.env.NAME || 'site-pulse';
const SITE_NAME = process.env.SITE_NAME || 'Horizon Cloud';
const SITE_TAGLINE =
  process.env.SITE_TAGLINE || 'Reliable infrastructure for modern teams.';
const FILE_PATH = process.env.FILE_PATH || path.join(os.tmpdir(), 'site-pulse');
const PROJECT_URL = (process.env.PROJECT_URL || '').replace(/\/+$/, '');
const AUTO_ACCESS = ['true', '1', 'yes'].includes(
  String(process.env.AUTO_ACCESS || 'false').toLowerCase()
);
const KEEP_ALIVE_INTERVAL_MS = parseInt(process.env.KEEP_ALIVE_INTERVAL_MS || '120000', 10);
const WS_PATH = '/vless';
const XRAY_BIN = process.env.XRAY_BIN || 'xray';
const CLOUDFLARED_BIN = process.env.CLOUDFLARED_BIN || 'cloudflared';
const WEB_DIST =
  process.env.WEB_DIST || path.join(__dirname, '..', 'web', 'dist');

const paths = {
  config: path.join(FILE_PATH, 'config.json'),
  bootLog: path.join(FILE_PATH, 'boot.log'),
  sub: path.join(FILE_PATH, 'sub.txt'),
  list: path.join(FILE_PATH, 'list.txt'),
  tunnelJson: path.join(FILE_PATH, 'tunnel.json'),
  tunnelYml: path.join(FILE_PATH, 'tunnel.yml'),
};

module.exports = {
  UUID,
  ARGO_DOMAIN,
  ARGO_AUTH,
  ARGO_PORT,
  CFIP,
  CFPORT,
  PORT,
  SUB_PATH,
  NAME,
  SITE_NAME,
  SITE_TAGLINE,
  FILE_PATH,
  PROJECT_URL,
  AUTO_ACCESS,
  KEEP_ALIVE_INTERVAL_MS,
  WS_PATH,
  XRAY_BIN,
  CLOUDFLARED_BIN,
  WEB_DIST,
  paths,
};
