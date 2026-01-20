import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CopilotClient } from '@github/copilot-sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve public path - works both in dev (src/) and prod (dist/src/)
function resolvePublicPath(): string {
  // Check if sibling public folder exists (dev mode: src/public)
  const siblingPublic = path.join(__dirname, 'public');
  if (fs.existsSync(siblingPublic)) {
    return siblingPublic;
  }
  // Fallback: assume we're in dist/src/, go up to find src/public
  return path.join(__dirname, '..', '..', 'src', 'public');
}

// Available models from GitHub Copilot CLI
const AVAILABLE_MODELS = [
  // GPT Models
  { id: 'gpt-5.2', name: 'GPT-5.2' },
  { id: 'gpt-5.2-codex', name: 'GPT-5.2 Codex' },
  { id: 'gpt-5.1', name: 'GPT-5.1' },
  { id: 'gpt-5.1-codex', name: 'GPT-5.1 Codex' },
  { id: 'gpt-5.1-codex-max', name: 'GPT-5.1 Codex Max' },
  { id: 'gpt-5.1-codex-mini', name: 'GPT-5.1 Codex Mini (Preview)' },
  { id: 'gpt-5', name: 'GPT-5' },
  { id: 'gpt-5-mini', name: 'GPT-5 Mini' },
  { id: 'gpt-5-codex', name: 'GPT-5 Codex (Preview)' },
  { id: 'gpt-4.1', name: 'GPT-4.1' },
  { id: 'gpt-4o', name: 'GPT-4o' },
  // Claude Models
  { id: 'claude-opus-4.5', name: 'Claude Opus 4.5' },
  { id: 'claude-opus-4.1', name: 'Claude Opus 4.1' },
  { id: 'claude-sonnet-4.5', name: 'Claude Sonnet 4.5' },
  { id: 'claude-sonnet-4', name: 'Claude Sonnet 4' },
  { id: 'claude-haiku-4.5', name: 'Claude Haiku 4.5' },
  // Gemini Models
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro (Preview)' },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (Preview)' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
  // Internal
  { id: 'goldeneye', name: 'Goldeneye (Internal Only)' },
];

export async function createApp() {
  const app = express();
  app.use(express.json());

  const MAX_MODELS = Number(process.env.MAX_MODELS ?? 3);

  const useMock = process.env.COPILOT_MOCK === '1';
  
  let client: CopilotClient | null = null;
  if (!useMock) {
    // Use the CLI path passed from bin/cli.js via environment variable
    // This bypasses the Windows cmd /c "copilot" quoting issue in @github/copilot-sdk
    const cliPath = process.env.COPILOT_CLI_PATH;
    client = cliPath ? new CopilotClient({ cliPath }) : new CopilotClient();
    await client.start();
  }

  // Serve static files from public directory
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

    if (!client) {
      res.json({ content: '[mock] response' });
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

    if (!client) {
      res.write(`data: ${JSON.stringify({ delta: '[mock] stream' })}\n\n`);
      res.write('event: done\n');
      res.write('data: {}\n\n');
      res.end();
      return;
    }

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

    if (models.length > MAX_MODELS) {
      res.status(400).json({ error: `MAX_MODELS=${MAX_MODELS} exceeded.` });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    if (!client) {
      models.forEach((modelId: string) => {
        res.write(`data: ${JSON.stringify({ model: modelId, delta: '[mock] response' })}\n\n`);
        res.write(`data: ${JSON.stringify({ model: modelId, done: true })}\n\n`);
      });
      res.write('event: done\ndata: {}\n\n');
      res.end();
      return;
    }

    const sessions = await Promise.all(
      models.map((modelId: string) =>
        client.createSession({ model: modelId, streaming: true })
      )
    );

    let completedCount = 0;
    const unsubscribers: (() => void)[] = [];

    sessions.forEach((session, index) => {
      const modelId = models[index];
      const unsubscribe = session.on((event: { type: string; data?: { deltaContent?: string } }) => {
        if (event.type === 'assistant.message_delta') {
          const chunk = event.data?.deltaContent ?? '';
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
      session.send({ prompt }).catch((error: unknown) => {
        res.write(`data: ${JSON.stringify({ model: models[index], error: String(error) })}\n\n`);
      });
    });
  });

  return app;
}
