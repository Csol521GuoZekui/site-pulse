#!/usr/bin/env node
'use strict';

const cfg = require('./config');
const { startProxy, shutdown, log } = require('./proxy');
const { startHttpServer } = require('./http');

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

async function main() {
  await startProxy();
  startHttpServer();
  log('ready');
  log(`site=${cfg.SITE_NAME}`);
}

main().catch((err) => {
  console.error('[site-pulse] fatal:', err);
  process.exit(1);
});
