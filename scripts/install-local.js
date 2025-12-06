#!/usr/bin/env node
/* eslint-disable no-console */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const VSIX = path.join(DIST, 'llm-council.vsix');
const CODE_BIN = process.env.CODE_BIN || 'code';

function run(cmd, args, opts = {}) {
  console.log(`> ${cmd} ${args.join(' ')}`);
  const res = spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit', ...opts });
  if (res.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} failed with code ${res.status ?? 'unknown'}`);
  }
}

function main() {
  if (!fs.existsSync(DIST)) {
    fs.mkdirSync(DIST, { recursive: true });
  }

  // Build
  run('npx', ['tsc', '-p', './']);

  // Package VSIX
  run('npx', ['vsce', 'package', '--no-yarn', '--out', VSIX]);

  // Install into VS Code
  run(CODE_BIN, ['--install-extension', VSIX, '--force']);
  console.log(`Installed LLM Council extension from ${VSIX}`);
}

try {
  main();
} catch (err) {
  console.error('[llm-council] Auto-install failed:', err.message);
  process.exit(1);
}
