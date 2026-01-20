#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import resolve from 'resolve';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.join(__dirname, '..');

// Resolve the @github/copilot CLI loader path
// Uses 'resolve' package to bypass Node.js exports restrictions
// Returns null if not found
function resolveCopilotCliPath() {
  if (process.env.COPILOT_MOCK === '1') {
    return null; // Mock mode doesn't need the CLI
  }
  try {
    return resolve.sync('@github/copilot/npm-loader.js', { basedir: packageRoot });
  } catch {
    return null;
  }
}

const copilotCliPath = resolveCopilotCliPath();

if (!copilotCliPath && process.env.COPILOT_MOCK !== '1') {
  console.error(`
╔══════════════════════════════════════════════════════════════════════╗
║  ERROR: @github/copilot package not found                            ║
╠══════════════════════════════════════════════════════════════════════╣
║  The Copilot CLI dependency could not be resolved.                   ║
║                                                                      ║
║  This is likely a packaging error. Please try:                       ║
║    npm cache clean --force                                           ║
║    npx github-llm-council@latest                                     ║
║                                                                      ║
║  Or report the issue at:                                             ║
║    https://github.com/varunr89/github-llm-council/issues             ║
╚══════════════════════════════════════════════════════════════════════╝
`);
  process.exit(1);
}

const port = process.env.PORT || '3000';
const noOpen = process.argv.includes('--no-open');

// Path to compiled server
const serverPath = path.join(__dirname, '..', 'dist', 'src', 'server.js');

console.log(`Starting LLM Council on port ${port}...`);

// Pass the resolved CLI path to the server via environment variable
const serverEnv = { ...process.env, PORT: port };
if (copilotCliPath) {
  serverEnv.COPILOT_CLI_PATH = copilotCliPath;
}

const server = spawn('node', [serverPath], {
  env: serverEnv,
  stdio: 'inherit',
});

if (!noOpen) {
  const open = await import('open');
  setTimeout(() => {
    const url = `http://localhost:${port}`;
    console.log(`Opening ${url} in browser...`);
    open.default(url);
  }, 2000);
}

process.on('SIGINT', () => {
  server.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  server.kill('SIGTERM');
  process.exit(0);
});

server.on('exit', (code) => {
  process.exit(code ?? 0);
});
