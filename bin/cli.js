#!/usr/bin/env node

import { spawn, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check for GitHub Copilot CLI before starting (cross-platform)
function checkCopilotCLI() {
  try {
    // Use 'where' on Windows, 'which' on Unix
    const isWindows = process.platform === 'win32';
    const checkCmd = isWindows ? 'where copilot' : 'which copilot';
    execSync(checkCmd, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

if (!checkCopilotCLI()) {
  console.error(`
╔══════════════════════════════════════════════════════════════════════╗
║  ERROR: GitHub Copilot CLI is not installed                          ║
╠══════════════════════════════════════════════════════════════════════╣
║  This tool requires the GitHub Copilot CLI to access Copilot models. ║
║                                                                      ║
║  Install with npm:                                                   ║
║    npm install -g @github/copilot                                    ║
║                                                                      ║
║  Or with Homebrew (macOS/Linux):                                     ║
║    brew install copilot-cli                                          ║
║                                                                      ║
║  Or with WinGet (Windows):                                           ║
║    winget install GitHub.Copilot                                     ║
║                                                                      ║
║  You also need an active GitHub Copilot subscription.                ║
║  Learn more: https://github.com/github/copilot-cli                   ║
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
