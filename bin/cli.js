#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Find @github/copilot by walking up the filesystem from our package location
// This bypasses Node.js exports restrictions that block require.resolve()
function findCopilotCliPath(startDir) {
  let dir = startDir;
  const root = path.parse(dir).root;
  
  while (dir !== root) {
    // Check node_modules/@github/copilot/npm-loader.js
    const copilotPath = path.join(dir, 'node_modules', '@github', 'copilot', 'npm-loader.js');
    if (existsSync(copilotPath)) {
      return copilotPath;
    }
    // Also check sibling in node_modules (for hoisted packages in npx cache)
    const siblingPath = path.join(dir, '@github', 'copilot', 'npm-loader.js');
    if (existsSync(siblingPath)) {
      return siblingPath;
    }
    dir = path.dirname(dir);
  }
  return null;
}

// Resolve the @github/copilot CLI loader path
// Returns null if not found
function resolveCopilotCliPath() {
  if (process.env.COPILOT_MOCK === '1') {
    return null; // Mock mode doesn't need the CLI
  }
  // Start from our package root (parent of bin/)
  const packageRoot = path.join(__dirname, '..');
  return findCopilotCliPath(packageRoot);
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
