#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check that @github/copilot is available (bundled dependency)
// Skip check in mock mode (for testing)
function checkCopilotPackage() {
  if (process.env.COPILOT_MOCK === '1') {
    return true;
  }
  try {
    const require = createRequire(import.meta.url);
    require.resolve('@github/copilot/package.json');
    return true;
  } catch {
    return false;
  }
}

if (!checkCopilotPackage()) {
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

const server = spawn('node', [serverPath], {
  env: { ...process.env, PORT: port },
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
