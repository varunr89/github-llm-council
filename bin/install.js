#!/usr/bin/env node
/* eslint-disable no-console */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const pkgRoot = path.join(__dirname, '..');
const vsixPath = path.join(pkgRoot, 'dist', 'llm-council.vsix');
const codeCandidates = [
  process.env.CODE_BIN,
  process.env.VSCODE_BIN,
  'code',
  'code-insiders'
].filter(Boolean);

function runCode(cmd, args) {
  const res = spawnSync(cmd, args, { stdio: 'inherit' });
  return res.status === 0;
}

function main() {
  if (!fs.existsSync(vsixPath)) {
    console.log(`[llm-council] VSIX not found at ${vsixPath}, skipping auto-install.`);
    console.log('[llm-council] This is expected in dev; run `npm run package:vsix` before publishing.');
    return;
  }

  const args = ['--install-extension', vsixPath, '--force'];

  for (const candidate of codeCandidates) {
    if (!candidate) continue;
    console.log(`[llm-council] Installing via ${candidate} ${args.join(' ')}`);
    if (runCode(candidate, args)) {
      console.log('[llm-council] Extension installed successfully.');
      return;
    }
  }

  console.error('[llm-council] Failed to install extension. Ensure `code` (VS Code CLI) is on your PATH.');
  console.error('On macOS: run "Shell Command: Install \'code\' command in PATH" from VS Code command palette.');
  console.error('On Windows/Linux: ensure the VS Code bin directory is on PATH.');
  process.exit(1);
}

main();
