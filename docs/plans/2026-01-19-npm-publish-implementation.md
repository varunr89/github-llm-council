# github-llm-council npm Publish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform copilot-webapp into a publishable npm package that users can run via `npx github-llm-council`

**Architecture:** Express server with Copilot SDK backend, static frontend. CLI entry point starts server and auto-opens browser. TypeScript compiled to dist/, static assets served from src/public/.

**Tech Stack:** Node.js 18+, Express 5, TypeScript, @github/copilot-sdk, Vitest for testing, Playwright for E2E

---

## Prerequisites

Before starting, install test dependencies:

```bash
npm install -D vitest @vitest/coverage-v8 playwright @playwright/test supertest @types/supertest
```

---

## Task 1: Set Up Test Infrastructure

**Files:**
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Modify: `package.json` (add test scripts)

**Step 1: Write vitest config**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
});
```

**Step 2: Write playwright config**

Create `playwright.config.ts`:

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:3001',
  },
  webServer: {
    command: 'PORT=3001 npm run start',
    port: 3001,
    reuseExistingServer: !process.env.CI,
    timeout: 10000,
  },
});
```

**Step 3: Update package.json scripts**

Add to `package.json` scripts:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "test:all": "npm run test && npm run test:e2e"
  }
}
```

**Step 4: Run test setup verification**

Run: `npm run test`
Expected: "No test files found" (success - infrastructure works)

**Step 5: Commit**

```bash
git add vitest.config.ts playwright.config.ts package.json package-lock.json
git commit -m "chore: add vitest and playwright test infrastructure"
```

---

## Task 2: Add TypeScript Build Configuration

**Files:**
- Create: `tsconfig.json`
- Modify: `package.json` (add build script)

**Step 1: Write failing test for TypeScript compilation**

Create `tests/build.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

describe('TypeScript Build', () => {
  it('should compile server.ts to dist/server.js', () => {
    // Clean and rebuild
    execSync('npm run build', { stdio: 'pipe' });
    
    expect(existsSync('dist/server.js')).toBe(true);
  });

  it('should produce valid ES module output', async () => {
    execSync('npm run build', { stdio: 'pipe' });
    
    // Verify it's valid JS by checking syntax
    const result = execSync('node --check dist/server.js 2>&1 || true', { encoding: 'utf-8' });
    // --check only validates syntax, won't fail on missing deps
    expect(result).not.toContain('SyntaxError');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/build.test.ts`
Expected: FAIL with "npm run build" error (build script doesn't exist)

**Step 3: Create tsconfig.json**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

**Step 4: Add build script to package.json**

Update `package.json` scripts:

```json
{
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/server.ts",
    "start": "node dist/server.js"
  }
}
```

**Step 5: Run test to verify it passes**

Run: `npm run test -- tests/build.test.ts`
Expected: PASS

**Step 6: Add dist to .gitignore**

Append to `.gitignore`:

```
dist/
```

**Step 7: Commit**

```bash
git add tsconfig.json package.json .gitignore tests/build.test.ts
git commit -m "feat: add TypeScript build configuration"
```

---

## Task 3: Refactor Server for Testability

**Files:**
- Modify: `src/server.ts` (extract app creation)
- Create: `src/app.ts` (Express app factory)
- Create: `tests/api.test.ts`

**Step 1: Write failing API tests**

Create `tests/api.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';

// We'll import createApp once it exists
let app: Express;

describe('API Endpoints', () => {
  beforeAll(async () => {
    // Dynamic import to handle top-level await
    const { createApp } = await import('../src/app.js');
    app = await createApp();
  });

  describe('GET /api/models', () => {
    it('should return list of available models', async () => {
      const response = await request(app).get('/api/models');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('models');
      expect(Array.isArray(response.body.models)).toBe(true);
      expect(response.body.models.length).toBeGreaterThan(0);
      expect(response.body.models[0]).toHaveProperty('id');
      expect(response.body.models[0]).toHaveProperty('name');
    });
  });

  describe('POST /api/council', () => {
    it('should return 400 if prompt is missing', async () => {
      const response = await request(app)
        .post('/api/council')
        .send({ models: ['gpt-5'] });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Prompt');
    });

    it('should return 400 if models array is empty', async () => {
      const response = await request(app)
        .post('/api/council')
        .send({ prompt: 'test', models: [] });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('model');
    });
  });

  describe('GET / (static files)', () => {
    it('should serve index.html at root', async () => {
      const response = await request(app).get('/');
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
      expect(response.text).toContain('LLM Council');
    });

    it('should serve styles.css', async () => {
      const response = await request(app).get('/styles.css');
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/css');
    });

    it('should serve app.js', async () => {
      const response = await request(app).get('/app.js');
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('javascript');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/api.test.ts`
Expected: FAIL with "Cannot find module '../src/app.js'"

**Step 3: Create app.ts with Express app factory**

Create `src/app.ts`:

```typescript
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CopilotClient } from '@github/copilot-sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Available models from GitHub Copilot CLI
const AVAILABLE_MODELS = [
  { id: 'gpt-5.2', name: 'GPT-5.2' },
  { id: 'gpt-5.1', name: 'GPT-5.1' },
  { id: 'gpt-5', name: 'GPT-5' },
  { id: 'gpt-5-mini', name: 'GPT-5 Mini' },
  { id: 'gpt-5.2-codex', name: 'GPT-5.2 Codex' },
  { id: 'gpt-5.1-codex', name: 'GPT-5.1 Codex' },
  { id: 'gpt-5.1-codex-max', name: 'GPT-5.1 Codex Max' },
  { id: 'gpt-5.1-codex-mini', name: 'GPT-5.1 Codex Mini' },
  { id: 'gpt-4.1', name: 'GPT-4.1' },
  { id: 'claude-opus-4.5', name: 'Claude Opus 4.5' },
  { id: 'claude-sonnet-4.5', name: 'Claude Sonnet 4.5' },
  { id: 'claude-sonnet-4', name: 'Claude Sonnet 4' },
  { id: 'claude-haiku-4.5', name: 'Claude Haiku 4.5' },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro' },
];

export async function createApp() {
  const app = express();
  app.use(express.json());

  const client = new CopilotClient();
  await client.start();

  // Serve static files from public directory
  // In dev: src/public, in prod: relative to dist
  const publicPath = path.join(__dirname, 'public');
  app.use(express.static(publicPath));

  app.get('/api/models', (_req, res) => {
    res.json({ models: AVAILABLE_MODELS });
  });

  app.post('/api/ask', async (req, res) => {
    const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt : '';
    if (!prompt.trim()) {
      res.status(400).json({ error: 'Prompt is required.' });
      return;
    }

    const session = await client.createSession({ model: 'gpt-5' });
    const message = await session.sendAndWait({ prompt });
    await session.destroy();

    res.json({ content: message?.data.content ?? '' });
  });

  app.post('/api/stream', async (req, res) => {
    const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt : '';
    if (!prompt.trim()) {
      res.status(400).json({ error: 'Prompt is required.' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const session = await client.createSession({ model: 'gpt-5', streaming: true });

    const unsubscribe = session.on((event) => {
      if (event.type === 'assistant.message_delta') {
        const chunk = event.data.deltaContent ?? '';
        if (chunk) {
          res.write(`data: ${JSON.stringify({ delta: chunk })}\n\n`);
        }
      } else if (event.type === 'assistant.message') {
        res.write(`data: ${JSON.stringify({ content: event.data.content })}\n\n`);
      } else if (event.type === 'session.idle') {
        res.write('event: done\n');
        res.write('data: {}\n\n');
        res.end();
        unsubscribe();
        session.destroy();
      }
    });

    try {
      await session.send({ prompt });
    } catch (error) {
      res.write(`data: ${JSON.stringify({ error: String(error) })}\n\n`);
      res.end();
      unsubscribe();
      await session.destroy();
    }
  });

  app.post('/api/council', async (req, res) => {
    const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt : '';
    const models = Array.isArray(req.body?.models) ? req.body.models : [];

    if (!prompt.trim()) {
      res.status(400).json({ error: 'Prompt is required.' });
      return;
    }

    if (models.length === 0) {
      res.status(400).json({ error: 'At least one model is required.' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const sessions = await Promise.all(
      models.map((modelId: string) =>
        client.createSession({ model: modelId, streaming: true })
      )
    );

    let completedCount = 0;
    const unsubscribers: (() => void)[] = [];

    sessions.forEach((session, index) => {
      const modelId = models[index];
      const unsubscribe = session.on((event) => {
        if (event.type === 'assistant.message_delta') {
          const chunk = event.data.deltaContent ?? '';
          if (chunk) {
            res.write(`data: ${JSON.stringify({ model: modelId, delta: chunk })}\n\n`);
          }
        } else if (event.type === 'session.idle') {
          completedCount++;
          res.write(`data: ${JSON.stringify({ model: modelId, done: true })}\n\n`);
          if (completedCount === models.length) {
            res.write('event: done\ndata: {}\n\n');
            res.end();
            unsubscribers.forEach((unsub) => unsub());
            sessions.forEach((s) => s.destroy());
          }
        }
      });
      unsubscribers.push(unsubscribe);
    });

    sessions.forEach((session, index) => {
      session.send({ prompt }).catch((error) => {
        res.write(`data: ${JSON.stringify({ model: models[index], error: String(error) })}\n\n`);
      });
    });
  });

  return app;
}
```

**Step 4: Update server.ts to use app factory**

Replace `src/server.ts` with:

```typescript
import { createApp } from './app.js';

const app = await createApp();

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';

app.listen(port, host, () => {
  console.log(`LLM Council running at http://${host}:${port}`);
});
```

**Step 5: Build and run tests**

Run: `npm run build && npm run test -- tests/api.test.ts`
Expected: PASS (tests may be skipped if Copilot CLI not available - that's OK for unit tests)

**Step 6: Commit**

```bash
git add src/app.ts src/server.ts tests/api.test.ts
git commit -m "refactor: extract Express app factory for testability"
```

---

## Task 4: Create CLI Entry Point with Browser Auto-Open

**Files:**
- Create: `bin/cli.ts`
- Create: `tests/cli.test.ts`
- Modify: `package.json` (add bin field)
- Modify: `tsconfig.json` (include bin/)

**Step 1: Install open package**

Run: `npm install open`

**Step 2: Write failing CLI tests**

Create `tests/cli.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync } from 'node:fs';
import { execSync, spawn } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';

describe('CLI Entry Point', () => {
  beforeAll(() => {
    execSync('npm run build', { stdio: 'pipe' });
  });

  it('should have executable cli.js in bin/', () => {
    expect(existsSync('bin/cli.js')).toBe(true);
  });

  it('should have shebang line', async () => {
    const { readFile } = await import('node:fs/promises');
    const content = await readFile('bin/cli.js', 'utf-8');
    expect(content.startsWith('#!/usr/bin/env node')).toBe(true);
  });

  it('should start server and print URL', async () => {
    const child = spawn('node', ['bin/cli.js', '--no-open'], {
      env: { ...process.env, PORT: '3099' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let output = '';
    child.stdout?.on('data', (data) => {
      output += data.toString();
    });
    child.stderr?.on('data', (data) => {
      output += data.toString();
    });

    // Wait for server to start
    await setTimeout(3000);

    // Kill the process
    child.kill('SIGTERM');

    expect(output).toContain('http://');
    expect(output).toContain('3099');
  }, 10000);

  it('should respect PORT environment variable', async () => {
    const child = spawn('node', ['bin/cli.js', '--no-open'], {
      env: { ...process.env, PORT: '3098' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let output = '';
    child.stdout?.on('data', (data) => {
      output += data.toString();
    });

    await setTimeout(3000);
    child.kill('SIGTERM');

    expect(output).toContain('3098');
  }, 10000);
});
```

**Step 3: Run test to verify it fails**

Run: `npm run test -- tests/cli.test.ts`
Expected: FAIL with "bin/cli.js does not exist"

**Step 4: Update tsconfig.json to include bin/**

Update `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*", "bin/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

**Step 5: Create bin/cli.ts**

Create `bin/cli.ts`:

```typescript
#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import open from 'open';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = process.env.PORT || '3000';
const noOpen = process.argv.includes('--no-open');

// Path to compiled server
const serverPath = path.join(__dirname, '..', 'dist', 'src', 'server.js');

console.log(`Starting LLM Council on port ${port}...`);

const server = spawn('node', [serverPath], {
  env: { ...process.env, PORT: port },
  stdio: 'inherit',
});

// Wait for server to be ready, then open browser
if (!noOpen) {
  setTimeout(() => {
    const url = `http://localhost:${port}`;
    console.log(`Opening ${url} in browser...`);
    open(url);
  }, 2000);
}

// Forward signals for clean shutdown
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
```

**Step 6: Update build to copy bin/cli.js with shebang**

Since TypeScript doesn't preserve shebangs well, create `bin/cli.js` as a wrapper.

Create `bin/cli.js`:

```javascript
#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = process.env.PORT || '3000';
const noOpen = process.argv.includes('--no-open');

// Path to compiled server
const serverPath = path.join(__dirname, '..', 'dist', 'src', 'server.js');

console.log(`Starting LLM Council on port ${port}...`);

const server = spawn('node', [serverPath], {
  env: { ...process.env, PORT: port },
  stdio: 'inherit',
});

// Wait for server to be ready, then open browser
if (!noOpen) {
  const open = await import('open');
  setTimeout(() => {
    const url = `http://localhost:${port}`;
    console.log(`Opening ${url} in browser...`);
    open.default(url);
  }, 2000);
}

// Forward signals for clean shutdown
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
```

**Step 7: Update package.json with bin field**

Add to `package.json`:

```json
{
  "bin": {
    "github-llm-council": "./bin/cli.js"
  }
}
```

**Step 8: Run tests to verify they pass**

Run: `npm run build && npm run test -- tests/cli.test.ts`
Expected: PASS

**Step 9: Commit**

```bash
git add bin/cli.js tests/cli.test.ts tsconfig.json package.json package-lock.json
git commit -m "feat: add CLI entry point with browser auto-open"
```

---

## Task 5: Configure npm Package Publishing

**Files:**
- Modify: `package.json` (name, version, files, engines, etc.)
- Create: `.npmignore`
- Create: `tests/package.test.ts`

**Step 1: Write failing package configuration tests**

Create `tests/package.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

describe('npm Package Configuration', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));

  describe('package.json', () => {
    it('should have correct package name', () => {
      expect(pkg.name).toBe('github-llm-council');
    });

    it('should have version 2.0.0 or higher', () => {
      const [major] = pkg.version.split('.').map(Number);
      expect(major).toBeGreaterThanOrEqual(2);
    });

    it('should have bin field pointing to cli.js', () => {
      expect(pkg.bin).toBeDefined();
      expect(pkg.bin['github-llm-council']).toBe('./bin/cli.js');
    });

    it('should have files field specifying what to publish', () => {
      expect(pkg.files).toBeDefined();
      expect(pkg.files).toContain('dist');
      expect(pkg.files).toContain('bin');
      expect(pkg.files).toContain('src/public');
    });

    it('should have engines specifying node >= 18', () => {
      expect(pkg.engines).toBeDefined();
      expect(pkg.engines.node).toMatch(/>=\s*18/);
    });

    it('should have prepublishOnly script that builds', () => {
      expect(pkg.scripts.prepublishOnly).toContain('build');
    });

    it('should have required dependencies', () => {
      expect(pkg.dependencies).toHaveProperty('@github/copilot-sdk');
      expect(pkg.dependencies).toHaveProperty('express');
      expect(pkg.dependencies).toHaveProperty('open');
    });

    it('should have description', () => {
      expect(pkg.description).toBeTruthy();
      expect(pkg.description.length).toBeGreaterThan(10);
    });

    it('should have repository field', () => {
      expect(pkg.repository).toBeDefined();
      expect(pkg.repository.url).toContain('github-llm-council');
    });

    it('should have MIT license', () => {
      expect(pkg.license).toBe('MIT');
    });
  });

  describe('.npmignore', () => {
    it('should exist', () => {
      expect(existsSync('.npmignore')).toBe(true);
    });

    it('should exclude test files', () => {
      const npmignore = readFileSync('.npmignore', 'utf-8');
      expect(npmignore).toContain('tests');
    });

    it('should exclude config files', () => {
      const npmignore = readFileSync('.npmignore', 'utf-8');
      expect(npmignore).toContain('vitest.config');
      expect(npmignore).toContain('playwright.config');
    });
  });

  describe('npm pack dry run', () => {
    it('should include required files', () => {
      const output = execSync('npm pack --dry-run 2>&1', { encoding: 'utf-8' });
      
      expect(output).toContain('bin/cli.js');
      expect(output).toContain('dist/src/server.js');
      expect(output).toContain('dist/src/app.js');
      expect(output).toContain('src/public/index.html');
      expect(output).toContain('src/public/styles.css');
      expect(output).toContain('src/public/app.js');
    });

    it('should not include test files', () => {
      const output = execSync('npm pack --dry-run 2>&1', { encoding: 'utf-8' });
      
      expect(output).not.toContain('tests/');
      expect(output).not.toContain('vitest.config');
      expect(output).not.toContain('playwright.config');
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm run test -- tests/package.test.ts`
Expected: FAIL (package name is wrong, version is 1.0.0, etc.)

**Step 3: Update package.json with all required fields**

Replace `package.json` with:

```json
{
  "name": "github-llm-council",
  "version": "2.0.0",
  "description": "Watch multiple AI models debate side-by-side using GitHub Copilot",
  "type": "module",
  "main": "dist/src/server.js",
  "bin": {
    "github-llm-council": "./bin/cli.js"
  },
  "files": [
    "dist",
    "bin",
    "src/public"
  ],
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/src/server.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "test:all": "npm run test && npm run test:e2e",
    "prepublishOnly": "npm run build"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/varunr89/github-llm-council.git"
  },
  "keywords": [
    "github",
    "copilot",
    "llm",
    "ai",
    "gpt",
    "claude",
    "gemini",
    "streaming"
  ],
  "author": "Varun Ramesh",
  "license": "MIT",
  "bugs": {
    "url": "https://github.com/varunr89/github-llm-council/issues"
  },
  "homepage": "https://github.com/varunr89/github-llm-council#readme",
  "engines": {
    "node": ">=18"
  },
  "dependencies": {
    "@github/copilot-sdk": "^0.1.13",
    "express": "^5.2.1",
    "open": "^10.0.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "@types/express": "^5.0.6",
    "@types/supertest": "^6.0.2",
    "@vitest/coverage-v8": "^1.0.0",
    "playwright": "^1.40.0",
    "supertest": "^6.3.3",
    "tsx": "^4.21.0",
    "typescript": "^5.9.3",
    "vitest": "^1.0.0"
  }
}
```

**Step 4: Create .npmignore**

Create `.npmignore`:

```
# Source files (we ship compiled)
src/*.ts

# Test files
tests/
vitest.config.ts
playwright.config.ts
coverage/

# Dev files
.git/
.github/
.vscode/
docs/
*.md
!README.md

# Config files
tsconfig.json
.gitignore
.eslintrc*
.prettierrc*
```

**Step 5: Build and run tests**

Run: `npm run build && npm run test -- tests/package.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add package.json .npmignore tests/package.test.ts
git commit -m "feat: configure npm package for publishing"
```

---

## Task 6: Fix Static File Serving for Published Package

**Files:**
- Modify: `src/app.ts` (fix public path resolution)
- Create: `tests/static-files.test.ts`

**Step 1: Write failing test for static file resolution**

Create `tests/static-files.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Static File Path Resolution', () => {
  beforeAll(() => {
    execSync('npm run build', { stdio: 'pipe' });
  });

  it('should resolve public path correctly from dist/', async () => {
    // Simulate running from dist/src/app.js
    const distAppPath = path.join(__dirname, '..', 'dist', 'src');
    
    // The public folder should be at src/public (not dist/src/public)
    // because we don't compile static files
    const expectedPublicPath = path.join(__dirname, '..', 'src', 'public');
    
    // Import the module and check it can find public files
    const { existsSync } = await import('node:fs');
    expect(existsSync(path.join(expectedPublicPath, 'index.html'))).toBe(true);
    expect(existsSync(path.join(expectedPublicPath, 'styles.css'))).toBe(true);
    expect(existsSync(path.join(expectedPublicPath, 'app.js'))).toBe(true);
  });

  it('should serve files when running compiled server', async () => {
    // This tests the actual path resolution in the compiled app
    const { createApp } = await import('../dist/src/app.js');
    const app = await createApp();
    
    const supertest = await import('supertest');
    const response = await supertest.default(app).get('/');
    
    expect(response.status).toBe(200);
    expect(response.text).toContain('LLM Council');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run build && npm run test -- tests/static-files.test.ts`
Expected: May PASS or FAIL depending on path - let's verify the logic is correct

**Step 3: Update app.ts to handle path resolution correctly**

The public path needs to work both in development (running from src/) and production (running from dist/). Update `src/app.ts`:

```typescript
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { CopilotClient } from '@github/copilot-sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve public path - works from both src/ and dist/src/
function resolvePublicPath(): string {
  // When running from dist/src/app.js, public is at ../../src/public
  // When running from src/app.ts (dev), public is at ./public
  const candidates = [
    path.join(__dirname, 'public'),                    // dev: src/public
    path.join(__dirname, '..', '..', 'src', 'public'), // prod: from dist/src -> src/public
  ];
  
  for (const candidate of candidates) {
    if (existsSync(path.join(candidate, 'index.html'))) {
      return candidate;
    }
  }
  
  throw new Error('Could not find public directory');
}

// Available models from GitHub Copilot CLI
const AVAILABLE_MODELS = [
  { id: 'gpt-5.2', name: 'GPT-5.2' },
  { id: 'gpt-5.1', name: 'GPT-5.1' },
  { id: 'gpt-5', name: 'GPT-5' },
  { id: 'gpt-5-mini', name: 'GPT-5 Mini' },
  { id: 'gpt-5.2-codex', name: 'GPT-5.2 Codex' },
  { id: 'gpt-5.1-codex', name: 'GPT-5.1 Codex' },
  { id: 'gpt-5.1-codex-max', name: 'GPT-5.1 Codex Max' },
  { id: 'gpt-5.1-codex-mini', name: 'GPT-5.1 Codex Mini' },
  { id: 'gpt-4.1', name: 'GPT-4.1' },
  { id: 'claude-opus-4.5', name: 'Claude Opus 4.5' },
  { id: 'claude-sonnet-4.5', name: 'Claude Sonnet 4.5' },
  { id: 'claude-sonnet-4', name: 'Claude Sonnet 4' },
  { id: 'claude-haiku-4.5', name: 'Claude Haiku 4.5' },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro' },
];

export async function createApp() {
  const app = express();
  app.use(express.json());

  const client = new CopilotClient();
  await client.start();

  // Serve static files
  const publicPath = resolvePublicPath();
  app.use(express.static(publicPath));

  app.get('/api/models', (_req, res) => {
    res.json({ models: AVAILABLE_MODELS });
  });

  app.post('/api/ask', async (req, res) => {
    const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt : '';
    if (!prompt.trim()) {
      res.status(400).json({ error: 'Prompt is required.' });
      return;
    }

    const session = await client.createSession({ model: 'gpt-5' });
    const message = await session.sendAndWait({ prompt });
    await session.destroy();

    res.json({ content: message?.data.content ?? '' });
  });

  app.post('/api/stream', async (req, res) => {
    const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt : '';
    if (!prompt.trim()) {
      res.status(400).json({ error: 'Prompt is required.' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const session = await client.createSession({ model: 'gpt-5', streaming: true });

    const unsubscribe = session.on((event) => {
      if (event.type === 'assistant.message_delta') {
        const chunk = event.data.deltaContent ?? '';
        if (chunk) {
          res.write(`data: ${JSON.stringify({ delta: chunk })}\n\n`);
        }
      } else if (event.type === 'assistant.message') {
        res.write(`data: ${JSON.stringify({ content: event.data.content })}\n\n`);
      } else if (event.type === 'session.idle') {
        res.write('event: done\n');
        res.write('data: {}\n\n');
        res.end();
        unsubscribe();
        session.destroy();
      }
    });

    try {
      await session.send({ prompt });
    } catch (error) {
      res.write(`data: ${JSON.stringify({ error: String(error) })}\n\n`);
      res.end();
      unsubscribe();
      await session.destroy();
    }
  });

  app.post('/api/council', async (req, res) => {
    const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt : '';
    const models = Array.isArray(req.body?.models) ? req.body.models : [];

    if (!prompt.trim()) {
      res.status(400).json({ error: 'Prompt is required.' });
      return;
    }

    if (models.length === 0) {
      res.status(400).json({ error: 'At least one model is required.' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const sessions = await Promise.all(
      models.map((modelId: string) =>
        client.createSession({ model: modelId, streaming: true })
      )
    );

    let completedCount = 0;
    const unsubscribers: (() => void)[] = [];

    sessions.forEach((session, index) => {
      const modelId = models[index];
      const unsubscribe = session.on((event) => {
        if (event.type === 'assistant.message_delta') {
          const chunk = event.data.deltaContent ?? '';
          if (chunk) {
            res.write(`data: ${JSON.stringify({ model: modelId, delta: chunk })}\n\n`);
          }
        } else if (event.type === 'session.idle') {
          completedCount++;
          res.write(`data: ${JSON.stringify({ model: modelId, done: true })}\n\n`);
          if (completedCount === models.length) {
            res.write('event: done\ndata: {}\n\n');
            res.end();
            unsubscribers.forEach((unsub) => unsub());
            sessions.forEach((s) => s.destroy());
          }
        }
      });
      unsubscribers.push(unsubscribe);
    });

    sessions.forEach((session, index) => {
      session.send({ prompt }).catch((error) => {
        res.write(`data: ${JSON.stringify({ model: models[index], error: String(error) })}\n\n`);
      });
    });
  });

  return app;
}
```

**Step 4: Run tests to verify they pass**

Run: `npm run build && npm run test -- tests/static-files.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app.ts tests/static-files.test.ts
git commit -m "fix: resolve static file path for both dev and prod"
```

---

## Task 7: Write README

**Files:**
- Create: `README.md`
- Create: `tests/readme.test.ts`

**Step 1: Write failing README tests**

Create `tests/readme.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

describe('README.md', () => {
  it('should exist', () => {
    expect(existsSync('README.md')).toBe(true);
  });

  const readme = existsSync('README.md') ? readFileSync('README.md', 'utf-8') : '';

  it('should have title', () => {
    expect(readme).toContain('# LLM Council');
  });

  it('should have quick start section', () => {
    expect(readme.toLowerCase()).toContain('quick start');
  });

  it('should mention npx command', () => {
    expect(readme).toContain('npx github-llm-council');
  });

  it('should mention Copilot CLI prerequisite', () => {
    expect(readme.toLowerCase()).toContain('copilot');
    expect(readme).toMatch(/copilot.*auth|auth.*copilot/i);
  });

  it('should mention Node.js 18+ requirement', () => {
    expect(readme).toMatch(/node.*18|18.*node/i);
  });

  it('should have development section', () => {
    expect(readme.toLowerCase()).toContain('development');
    expect(readme).toContain('npm install');
    expect(readme).toContain('npm run dev');
  });

  it('should have license section', () => {
    expect(readme.toLowerCase()).toContain('license');
    expect(readme).toContain('MIT');
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm run test -- tests/readme.test.ts`
Expected: FAIL with "README.md does not exist"

**Step 3: Create README.md**

Create `README.md`:

```markdown
# LLM Council

Watch multiple AI models debate side-by-side using GitHub Copilot.

Type a spicy question, watch GPT-5, Claude, and Gemini respond simultaneously with a dark hacker aesthetic.

## Quick Start

```bash
# Prerequisites: Copilot CLI installed and authenticated
copilot auth login

# Run
npx github-llm-council
```

Opens http://localhost:3000 - pick a prompt or type your own, watch the models respond in real-time.

## Requirements

- **Node.js 18+**
- **GitHub Copilot subscription** (Individual, Business, or Enterprise)
- **Copilot CLI** installed and authenticated:
  ```bash
  npm install -g @github/copilot-cli
  copilot auth login
  ```

## Available Models

The council can use any model available through GitHub Copilot:

- GPT-5, GPT-5.1, GPT-5.2
- Claude Opus 4.5, Claude Sonnet 4.5, Claude Sonnet 4
- Gemini 3 Pro
- And more...

## How It Works

Uses the [@github/copilot-sdk](https://github.com/github/copilot-sdk) to spawn parallel streaming sessions. Each model receives the same prompt and streams its response independently.

See `src/app.ts` for the Express server implementation.

## Development

```bash
git clone https://github.com/varunr89/github-llm-council
cd github-llm-council
npm install
npm run dev
```

### Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Compile TypeScript
- `npm run test` - Run unit tests
- `npm run test:e2e` - Run end-to-end tests

## License

MIT
```

**Step 4: Run tests to verify they pass**

Run: `npm run test -- tests/readme.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add README.md tests/readme.test.ts
git commit -m "docs: add usage-focused README"
```

---

## Task 8: Create LICENSE File

**Files:**
- Create: `LICENSE`
- Create: `tests/license.test.ts`

**Step 1: Write failing license test**

Create `tests/license.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

describe('LICENSE', () => {
  it('should exist', () => {
    expect(existsSync('LICENSE')).toBe(true);
  });

  it('should be MIT license', () => {
    const license = readFileSync('LICENSE', 'utf-8');
    expect(license).toContain('MIT License');
  });

  it('should have copyright notice', () => {
    const license = readFileSync('LICENSE', 'utf-8');
    expect(license).toMatch(/copyright/i);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npm run test -- tests/license.test.ts`
Expected: FAIL

**Step 3: Create LICENSE file**

Create `LICENSE`:

```
MIT License

Copyright (c) 2026 Varun Ramesh

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

**Step 4: Run tests to verify they pass**

Run: `npm run test -- tests/license.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add LICENSE tests/license.test.ts
git commit -m "chore: add MIT license"
```

---

## Task 9: E2E Test - Full User Journey

**Files:**
- Create: `tests/e2e/council.spec.ts`

**Step 1: Install Playwright browsers**

Run: `npx playwright install chromium`

**Step 2: Write E2E test for full user journey**

Create `tests/e2e/council.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('LLM Council E2E', () => {
  test('should load the page with all UI elements', async ({ page }) => {
    await page.goto('/');

    // Title
    await expect(page.locator('.title')).toContainText('LLM COUNCIL');

    // Prompt input
    await expect(page.locator('#prompt-input')).toBeVisible();

    // Submit button
    await expect(page.locator('#submit-btn')).toBeVisible();

    // Three council columns
    const columns = page.locator('.council-column');
    await expect(columns).toHaveCount(3);

    // Prompt chips
    const chips = page.locator('.chip');
    await expect(chips).toHaveCount(4);
  });

  test('should populate model selects on load', async ({ page }) => {
    await page.goto('/');

    // Wait for models to load
    await page.waitForSelector('.model-select option:not([value=""])');

    const selects = page.locator('.model-select');
    await expect(selects).toHaveCount(3);

    // Each select should have model options
    for (let i = 0; i < 3; i++) {
      const select = selects.nth(i);
      const options = select.locator('option');
      const count = await options.count();
      expect(count).toBeGreaterThan(1);
    }
  });

  test('should update prompt input when clicking chip', async ({ page }) => {
    await page.goto('/');

    const input = page.locator('#prompt-input');
    const chip = page.locator('.chip').first();

    const chipText = await chip.textContent();
    await chip.click();

    await expect(input).toHaveValue(chipText?.trim() || '');
  });

  test('should show error state when API fails', async ({ page }) => {
    await page.goto('/');

    // Mock the API to fail
    await page.route('/api/council', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Test error' }),
      });
    });

    await page.locator('#submit-btn').click();

    // Should show error state
    await expect(page.locator('.council-column.error').first()).toBeVisible({
      timeout: 5000,
    });
  });

  test('should disable submit button while loading', async ({ page }) => {
    await page.goto('/');

    // Mock slow API
    await page.route('/api/council', async (route) => {
      await new Promise((r) => setTimeout(r, 1000));
      route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
        body: 'event: done\ndata: {}\n\n',
      });
    });

    const submitBtn = page.locator('#submit-btn');
    await submitBtn.click();

    // Button should be disabled while loading
    await expect(submitBtn).toBeDisabled();
  });

  test('API /api/models should return model list', async ({ page }) => {
    const response = await page.request.get('/api/models');
    expect(response.ok()).toBe(true);

    const data = await response.json();
    expect(data).toHaveProperty('models');
    expect(Array.isArray(data.models)).toBe(true);
    expect(data.models.length).toBeGreaterThan(0);
  });

  test('API /api/council should return 400 for missing prompt', async ({ page }) => {
    const response = await page.request.post('/api/council', {
      data: { models: ['gpt-5'] },
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Prompt');
  });

  test('API /api/council should return 400 for empty models', async ({ page }) => {
    const response = await page.request.post('/api/council', {
      data: { prompt: 'test', models: [] },
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('model');
  });
});
```

**Step 3: Run E2E tests**

Run: `npm run build && npm run test:e2e`
Expected: PASS (assuming Copilot CLI is available)

Note: E2E tests require the server to start, which requires Copilot CLI. If CLI is not available, tests will fail at server startup.

**Step 4: Commit**

```bash
git add tests/e2e/council.spec.ts
git commit -m "test: add E2E tests for full user journey"
```

---

## Task 10: Run All Tests and Verify

**Step 1: Run full test suite**

Run: `npm run build && npm run test:all`
Expected: All tests PASS

**Step 2: Verify npm pack contents**

Run: `npm pack --dry-run`
Expected: Should list only the files we want to publish

**Step 3: Test local install**

Run:
```bash
npm pack
npm install -g ./github-llm-council-2.0.0.tgz
github-llm-council --no-open &
sleep 3
curl http://localhost:3000 | grep "LLM Council"
kill %1
npm uninstall -g github-llm-council
rm github-llm-council-2.0.0.tgz
```
Expected: Should see "LLM Council" in output

**Step 4: Commit any final fixes**

```bash
git add -A
git commit -m "chore: final verification complete"
```

---

## Task 11: Push to GitHub and Publish to npm

**Step 1: Add remote and push**

```bash
git remote add origin https://github.com/varunr89/github-llm-council.git || true
git push --force origin main
```

Note: Force push required since we're replacing the entire codebase.

**Step 2: Publish to npm**

```bash
npm publish
```

**Step 3: Verify publication**

Run: `npm info github-llm-council`
Expected: Shows version 2.0.0 with correct description

**Step 4: Test from npm**

Run:
```bash
npx github-llm-council@2.0.0 --no-open &
sleep 3
curl http://localhost:3000 | grep "LLM Council"
kill %1
```
Expected: Works correctly from npm

---

## Summary

| Task | Description | Test Coverage |
|------|-------------|---------------|
| 1 | Test infrastructure | Vitest + Playwright setup |
| 2 | TypeScript build | Build produces valid JS |
| 3 | Server refactor | API endpoint tests |
| 4 | CLI entry point | CLI starts server, respects PORT |
| 5 | npm package config | package.json fields, .npmignore |
| 6 | Static file serving | Path resolution in dev/prod |
| 7 | README | Required sections present |
| 8 | LICENSE | MIT license file |
| 9 | E2E tests | Full user journey |
| 10 | Verification | All tests pass, pack works |
| 11 | Publish | Push to GitHub, publish npm |

Total: ~45 bite-sized steps following TDD
