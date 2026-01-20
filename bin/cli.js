#!/usr/bin/env node

import { spawn, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check for GitHub Copilot CLI before starting
function checkCopilotCLI() {
  try {
    execSync('gh copilot --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function checkGitHubCLI() {
  try {
    execSync('gh --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

if (!checkGitHubCLI()) {
  console.error(`
╔════════════════════════════════════════════════════════════════════╗
║  ERROR: GitHub CLI (gh) is not installed                           ║
╠════════════════════════════════════════════════════════════════════╣
║  This tool requires the GitHub CLI to access Copilot models.       ║
║                                                                    ║
║  Install it from: https://cli.github.com/                          ║
║                                                                    ║
║  After installing, authenticate with:                              ║
║    gh auth login                                                   ║
╚════════════════════════════════════════════════════════════════════╝
`);
  process.exit(1);
}

if (!checkCopilotCLI()) {
  console.error(`
╔════════════════════════════════════════════════════════════════════╗
║  ERROR: GitHub Copilot CLI extension is not installed              ║
╠════════════════════════════════════════════════════════════════════╣
║  This tool requires the Copilot extension for the GitHub CLI.      ║
║                                                                    ║
║  Install it with:                                                  ║
║    gh extension install github/gh-copilot                          ║
║                                                                    ║
║  You also need an active GitHub Copilot subscription.              ║
║  Learn more: https://github.com/features/copilot                   ║
╚════════════════════════════════════════════════════════════════════╝
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
