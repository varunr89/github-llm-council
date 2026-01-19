# LLM Council npm Publish Design

## Overview

Migrate the `github-llm-council` package from a VS Code extension to a standalone web app using the GitHub Copilot SDK. Users run `npx github-llm-council` to spin up a local server that streams responses from multiple AI models side-by-side.

**Target audience:** Developers exploring the Copilot SDK

## User Journey

```
1. npm install -g github-llm-council  (or npx github-llm-council)
2. github-llm-council
3. Browser auto-opens to http://localhost:3000
4. User types prompt, sees 3+ models respond simultaneously
```

## Prerequisites for Users

- Node.js 18+
- GitHub Copilot subscription (Individual/Business/Enterprise)
- Copilot CLI installed and authenticated (`copilot auth login`)

## Repository Structure

```
github-llm-council/
├── bin/
│   └── cli.js              # Entry point for npx - starts server + opens browser
├── src/
│   ├── server.ts           # Express + Copilot SDK
│   └── public/
│       ├── index.html      # Demo UI
│       ├── styles.css      # Dark hacker aesthetic
│       └── app.js          # Frontend streaming logic
├── dist/                   # Compiled TypeScript (generated)
├── package.json            # npm package config with "bin" field
├── tsconfig.json
├── README.md               # Usage-focused docs
└── LICENSE                 # MIT
```

## package.json Configuration

```json
{
  "name": "github-llm-council",
  "version": "2.0.0",
  "description": "Watch multiple AI models debate side-by-side using GitHub Copilot",
  "type": "module",
  "bin": {
    "github-llm-council": "./bin/cli.js"
  },
  "files": ["dist", "bin", "src/public"],
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "prepublishOnly": "npm run build"
  },
  "dependencies": {
    "@github/copilot-sdk": "^0.1.13",
    "express": "^5.2.1",
    "open": "^10.0.0"
  },
  "devDependencies": {
    "@types/express": "^5.0.6",
    "tsx": "^4.21.0",
    "typescript": "^5.9.3"
  },
  "engines": {
    "node": ">=18"
  }
}
```

## bin/cli.js Behavior

1. Start the Express server on available port (default 3000)
2. Wait for server to be ready
3. Auto-open `http://localhost:<port>` in default browser
4. Print URL to console as fallback

```javascript
#!/usr/bin/env node
import { spawn } from 'node:child_process';
import open from 'open';

const port = process.env.PORT || 3000;

// Start server
const server = spawn('node', ['dist/server.js'], {
  stdio: 'inherit',
  env: { ...process.env, PORT: port }
});

// Wait a moment for server startup, then open browser
setTimeout(() => {
  open(`http://localhost:${port}`);
}, 1500);

// Forward signals
process.on('SIGINT', () => server.kill('SIGINT'));
process.on('SIGTERM', () => server.kill('SIGTERM'));
```

## README Content

```markdown
# LLM Council

Watch multiple AI models debate side-by-side using GitHub Copilot.

## Quick Start

# Prerequisites: Copilot CLI installed and authenticated
copilot auth login

# Run
npx github-llm-council

Opens http://localhost:3000 - pick a prompt, watch GPT-5, Claude, and Gemini respond simultaneously.

## Requirements

- Node.js 18+
- GitHub Copilot subscription
- Copilot CLI (`npm install -g @github/copilot-cli && copilot auth login`)

## Available Models

GPT-5, GPT-5.2, Claude Sonnet 4.5, Claude Opus 4.5, Gemini 3 Pro, and more.

## How It Works

Uses the @github/copilot-sdk to spawn parallel streaming sessions.
See src/server.ts for the implementation.

## Development

git clone https://github.com/varunr89/github-llm-council
cd github-llm-council
npm install
npm run dev

## License

MIT
```

## Migration Steps

1. **Prepare the local codebase:**
   - Add `bin/cli.js` with auto-open browser logic
   - Update `package.json` with bin field, files, version 2.0.0
   - Add/update `tsconfig.json` for TypeScript build
   - Write the README
   - Add `open` package dependency

2. **Push to GitHub:**
   - Add `varunr89/github-llm-council` as remote
   - Replace all content with new implementation
   - Force push to main (complete rewrite)

3. **Publish to npm:**
   - `npm publish` (owner already has access)

## Version Strategy

`2.0.0` - Major version bump signals breaking change from VS Code extension to standalone web app. Existing users will see completely different experience.

## Scope Boundaries

**In scope:**
- npx-runnable web app
- Auto-open browser
- Usage-focused README
- MIT license

**Out of scope:**
- CI/CD automation
- Automated tests (can add later)
- Docker support
- Custom port CLI flag (can add later)
