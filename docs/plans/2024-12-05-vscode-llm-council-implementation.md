# VS Code LLM Council Extension Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a VS Code extension that runs a 3-stage council via the LM API from an editor context menu, streaming results to an output channel and persisting run summaries.

**Architecture:** TypeScript extension with a single command `llmCouncil.run`. Core services: model resolver (LM API), context resolver (selection/file/none), prompt templates, council pipeline (3 stages), output channel logger (stream tags), history store (globalState). UI via context menu + quick picks/input boxes; no webview.

**Tech Stack:** TypeScript, VS Code Extension API, VS Code LM API (`vscode.lm`), Node 18+, Mocha/@vscode/test-electron for integration, Vitest for unit logic.

---

### Task 1: Scaffold extension and command stub

**Files:**
- Create: `package.json`, `tsconfig.json`, `.vscodeignore`, `.eslintrc.json`
- Create: `src/extension.ts`, `src/test/runTest.ts`, `src/test/suite/extension.test.ts`
- Modify: `README.md`

**Step 1: Write the failing test**

`src/test/suite/extension.test.ts`:
```ts
import * as vscode from 'vscode';
import * as assert from 'assert';

suite('Extension Tests', () => {
  test('registers llmCouncil.run command', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('llmCouncil.run'));
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`

Expected: FAIL (command not registered).

**Step 3: Write minimal implementation**

`src/extension.ts`:
```ts
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('llmCouncil.run', () => {
    vscode.window.showInformationMessage('LLM Council placeholder');
  });
  context.subscriptions.push(disposable);
}

export function deactivate() {}
```

Add `package.json` activation and contributes:
```json
{
  "name": "llm-council",
  "displayName": "LLM Council",
  "version": "0.0.1",
  "engines": { "vscode": "^1.84.0" },
  "activationEvents": ["onCommand:llmCouncil.run"],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [
      { "command": "llmCouncil.run", "title": "LLM Council" }
    ],
    "menus": {
      "editor/context": [
        { "command": "llmCouncil.run", "group": "navigation" }
      ]
    }
  },
  "scripts": {
    "vscode:prepublish": "npm run compile",
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./",
    "test": "npm run compile && npm run test:integration",
    "test:integration": "node ./out/test/runTest.js",
    "lint": "eslint src --ext .ts"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/mocha": "^10.0.0",
    "typescript": "^5.0.0",
    "mocha": "^10.0.0",
    "@vscode/test-electron": "^2.4.0",
    "eslint": "^8.0.0"
  }
}
```

Add `tsconfig.json` for out dir `out`. Add `.vscodeignore` to exclude tests/node_modules. Add `README.md` intro.

**Step 4: Run test to verify it passes**

Run: `npm test`

Expected: PASS (command registered).

**Step 5: Commit**

```bash
git add package.json tsconfig.json .vscodeignore .eslintrc.json src README.md
git commit -m "chore: scaffold extension and llmCouncil.run command"
```

### Task 2: Model resolver service and settings

**Files:**
- Create: `src/council/modelResolver.ts`
- Create: `src/test/unit/modelResolver.test.ts`
- Modify: `package.json` (scripts for unit tests), `src/extension.ts` (wire resolver), `package.json` contributes configuration (default models)

**Step 1: Write the failing test**

`src/test/unit/modelResolver.test.ts` (Vitest):
```ts
import { describe, it, expect } from 'vitest';
import { pickDefaultModels } from '../../src/council/modelResolver';

describe('pickDefaultModels', () => {
  const desired = ['gpt-5.1', 'sonnet-4.5', 'gemini-pro-3'];
  const available = [
    { id: 'sonnet-4.5', quality: 0.9 },
    { id: 'other-1', quality: 0.7 },
    { id: 'gpt-5.1', quality: 1 },
    { id: 'gemini-pro-3', quality: 0.8 }
  ];
  it('prefers configured models, fills to three with best available', () => {
    const result = pickDefaultModels(desired, available, 3);
    expect(result).toEqual(['gpt-5.1', 'sonnet-4.5', 'gemini-pro-3']);
  });
  it('falls back when desired missing', () => {
    const result = pickDefaultModels(desired, [{ id: 'sonnet-4.5', quality: 0.9 }], 3);
    expect(result).toEqual(['sonnet-4.5']);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit`

Expected: FAIL (function missing).

**Step 3: Write minimal implementation**

`src/council/modelResolver.ts`:
```ts
export type ChatModelInfo = { id: string; quality?: number };

export function pickDefaultModels(desired: string[], available: ChatModelInfo[], max = 3): string[] {
  const desiredSet = new Set(desired);
  const desiredHits = available.filter(m => desiredSet.has(m.id)).map(m => m.id);
  if (desiredHits.length >= max) return desiredHits.slice(0, max);
  const remaining = available
    .filter(m => !desiredSet.has(m.id))
    .sort((a, b) => (b.quality ?? 0) - (a.quality ?? 0))
    .map(m => m.id);
  return [...desiredHits, ...remaining].slice(0, max);
}
```

Add setting in `package.json`:
```json
"configuration": {
  "title": "LLM Council",
  "properties": {
    "llmCouncil.defaultModels": {
      "type": "array",
      "default": ["gpt-5.1", "sonnet-4.5", "gemini-pro-3"],
      "description": "Preferred model ids for council; first available three are used."
    }
  }
}
```

Add Vitest to devDependencies and script:
```json
"scripts": {
  "test:unit": "vitest run",
  "test": "npm run compile && npm run test:unit && npm run test:integration"
},
"devDependencies": {
  "vitest": "^1.0.0",
  "ts-node": "^10.0.0"
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:unit`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/council/modelResolver.ts src/test/unit/modelResolver.test.ts package.json
git commit -m "feat: add model resolver with defaults and settings"
```

### Task 3: Context resolver and prompt templates

**Files:**
- Create: `src/council/contextResolver.ts`
- Create: `src/prompts.ts`
- Create: `src/test/unit/contextResolver.test.ts`
- Modify: `src/extension.ts` (wire context resolution)

**Step 1: Write the failing test**

`src/test/unit/contextResolver.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { chooseContext } from '../../src/council/contextResolver';

describe('chooseContext', () => {
  it('uses selection when provided', () => {
    const result = chooseContext({ selection: 'sel', document: 'file', mode: 'auto' });
    expect(result).toEqual({ kind: 'selection', text: 'sel' });
  });
  it('falls back to file when selection empty', () => {
    const result = chooseContext({ selection: '', document: 'file', mode: 'auto' });
    expect(result).toEqual({ kind: 'file', text: 'file' });
  });
  it('can force none', () => {
    const result = chooseContext({ selection: 'sel', document: 'file', mode: 'none' });
    expect(result).toEqual({ kind: 'none' });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit`

Expected: FAIL (function missing).

**Step 3: Write minimal implementation**

`src/council/contextResolver.ts`:
```ts
export type ContextMode = 'auto' | 'file' | 'selection' | 'none';
export type ResolvedContext = { kind: 'none' } | { kind: 'file' | 'selection'; text: string };

export function chooseContext(input: { selection: string; document: string; mode: ContextMode }): ResolvedContext {
  if (input.mode === 'none') return { kind: 'none' };
  if (input.mode === 'selection' && input.selection) return { kind: 'selection', text: input.selection };
  if (input.mode === 'file') return { kind: 'file', text: input.document };
  if (input.selection) return { kind: 'selection', text: input.selection };
  return input.document ? { kind: 'file', text: input.document } : { kind: 'none' };
}
```

`src/prompts.ts`: export default prompt templates array with ids/titles/body strings (Explain, Debug, Review code, Summarize).

**Step 4: Run test to verify it passes**

Run: `npm run test:unit`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/council/contextResolver.ts src/prompts.ts src/test/unit/contextResolver.test.ts
git commit -m "feat: add context resolver and prompt templates"
```

### Task 4: Output channel logger and history store

**Files:**
- Create: `src/council/outputChannel.ts`
- Create: `src/council/historyStore.ts`
- Create: `src/test/unit/historyStore.test.ts`
- Modify: `package.json` (history size setting)

**Step 1: Write the failing test**

`src/test/unit/historyStore.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { HistoryStore, RunSummary } from '../../src/council/historyStore';

describe('HistoryStore', () => {
  it('adds and caps history', () => {
    const mockState = new Map<string, any>();
    const store = new HistoryStore({ get: k => mockState.get(k), update: (k, v) => { mockState.set(k, v); } }, 2);
    const base = (id: string): RunSummary => ({ id, prompt: 'p', models: [], finalAnswer: 'a', ts: Date.now() });
    store.add(base('1'));
    store.add(base('2'));
    store.add(base('3'));
    const all = store.all();
    expect(all.length).toBe(2);
    expect(all[0].id).toBe('3');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit`

Expected: FAIL (class missing).

**Step 3: Write minimal implementation**

`src/council/historyStore.ts`:
```ts
export type RunSummary = { id: string; prompt: string; models: string[]; finalAnswer: string; ts: number };

type Memento = { get(key: string): any; update(key: string, value: any): Thenable<void> | void };

export class HistoryStore {
  private key = 'llmCouncil.history';
  constructor(private memento: Memento, private cap: number) {}

  add(summary: RunSummary) {
    const items = this.all();
    const updated = [summary, ...items].slice(0, this.cap);
    return this.memento.update(this.key, updated);
  }

  all(): RunSummary[] {
    return (this.memento.get(this.key) as RunSummary[] | undefined) ?? [];
  }
}
```

`src/council/outputChannel.ts`: create channel, provide `log(stage, modelId, text)` and `appendStreaming` that tags lines with `[stage:model]`.

Add config setting:
```json
"llmCouncil.historySize": {
  "type": "number",
  "default": 20,
  "description": "Maximum number of run summaries to keep."
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:unit`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/council/historyStore.ts src/council/outputChannel.ts src/test/unit/historyStore.test.ts package.json
git commit -m "feat: add output logger and history store with cap"
```

### Task 5: Council pipeline (3 stages) with LM API adapters

**Files:**
- Create: `src/council/pipeline.ts`
- Create: `src/council/types.ts`
- Create: `src/test/unit/pipeline.test.ts`
- Modify: `package.json` (script stays)

**Step 1: Write the failing test**

`src/test/unit/pipeline.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { runCouncil, StubLmClient } from '../../src/council/pipeline';

describe('runCouncil', () => {
  it('produces final answer via chair', async () => {
    const client = new StubLmClient({
      stage1: { a: 'answer A', b: 'answer B' },
      stage2: { a: 'A> B', b: 'B> A' },
      stage3: 'final answer'
    });
    const result = await runCouncil({
      prompt: 'Q',
      contextText: 'CTX',
      models: ['a', 'b'],
      chair: 'a'
    }, client, { onToken: () => {} });
    expect(result.finalAnswer).toBe('final answer');
    expect(result.stage1.a).toBe('answer A');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit`

Expected: FAIL (runCouncil missing).

**Step 3: Write minimal implementation**

`src/council/pipeline.ts`:
```ts
export type RunInputs = { prompt: string; contextText?: string; models: string[]; chair: string };
export type StageResult = { stage1: Record<string, string>; stage2: Record<string, string>; finalAnswer: string };
export type TokenSink = { onToken: (stage: string, model: string, chunk: string) => void };

export interface LmClient {
  chat(model: string, messages: { role: 'user' | 'system'; content: string }[], onToken: (t: string) => void): Promise<string>;
}

export async function runCouncil(input: RunInputs, client: LmClient, sink: TokenSink): Promise<StageResult> {
  const baseMessages = [{ role: 'system', content: `You are ${input.models.join(', ')}` as const }, { role: 'user', content: input.prompt + (input.contextText ? `\nContext:\n${input.contextText}` : '') }];
  const stage1Entries = await Promise.all(input.models.map(async m => {
    let text = '';
    const resp = await client.chat(m, baseMessages, chunk => { text += chunk; sink.onToken('S1', m, chunk); });
    return [m, resp ?? text] as const;
  }));
  const stage1: Record<string, string> = Object.fromEntries(stage1Entries);

  const stage2Entries = await Promise.all(input.models.map(async m => {
    let text = '';
    const review = await client.chat(m, [{ role: 'system', content: 'Review answers' }, { role: 'user', content: JSON.stringify(stage1) }], chunk => { text += chunk; sink.onToken('S2', m, chunk); });
    return [m, review ?? text] as const;
  }));
  const stage2: Record<string, string> = Object.fromEntries(stage2Entries);

  let finalText = '';
  const finalAnswer = await client.chat(input.chair, [
    { role: 'system', content: 'Synthesize best answer' },
    { role: 'user', content: JSON.stringify({ prompt: input.prompt, context: input.contextText, stage1, stage2 }) }
  ], chunk => { finalText += chunk; sink.onToken('S3', input.chair, chunk); });

  return { stage1, stage2, finalAnswer: finalAnswer ?? finalText };
}

export class StubLmClient implements LmClient {
  constructor(private scripted: { stage1: Record<string, string>; stage2: Record<string, string>; stage3: string }) {}
  async chat(model: string, _messages: any, onToken: (t: string) => void): Promise<string> {
    if (this.scripted.stage1[model]) {
      onToken(this.scripted.stage1[model]);
      return this.scripted.stage1[model];
    }
    if (this.scripted.stage2[model]) {
      onToken(this.scripted.stage2[model]);
      return this.scripted.stage2[model];
    }
    onToken(this.scripted.stage3);
    return this.scripted.stage3;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test:unit`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/council/pipeline.ts src/council/types.ts src/test/unit/pipeline.test.ts
git commit -m "feat: add council pipeline with stub LM client and streaming hook"
```

### Task 6: Wire command flow, UI, and LM API integration

**Files:**
- Modify: `src/extension.ts`
- Modify: `src/council/outputChannel.ts` (stream append)
- Modify: `src/council/modelResolver.ts` (add LM API lookup)
- Create: `src/council/runCommand.ts`
- Create: `src/test/integration/commandFlow.test.ts`

**Step 1: Write the failing test**

`src/test/integration/commandFlow.test.ts`:
```ts
import * as vscode from 'vscode';
import * as assert from 'assert';

suite('Command flow', () => {
  test('command invokes without throwing', async () => {
    await assert.doesNotReject(vscode.commands.executeCommand('llmCouncil.run'));
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`

Expected: FAIL (command handler not wired).

**Step 3: Write minimal implementation**

`src/council/runCommand.ts` (pseudo-code structure):
```ts
import * as vscode from 'vscode';
import { pickDefaultModels } from './modelResolver';
import { chooseContext } from './contextResolver';
import { runCouncil } from './pipeline';
import prompts from '../prompts';
import { OutputLogger } from './outputChannel';
import { HistoryStore } from './historyStore';

export async function runCommand(ctx: vscode.ExtensionContext) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;
  const selection = editor.document.getText(editor.selection);
  const docText = editor.document.getText();
  const contextMode = await vscode.window.showQuickPick(
    [{ label: 'Selection', mode: 'selection' }, { label: 'File (default)', mode: 'file' }, { label: 'None', mode: 'none' }],
    { placeHolder: 'Pick context', canPickMany: false }
  );
  const resolvedCtx = chooseContext({ selection, document: docText, mode: (contextMode?.mode as any) ?? 'file' });
  const promptTemplate = await vscode.window.showQuickPick(prompts.map(p => ({ label: p.title, body: p.body })), { placeHolder: 'Pick prompt (you can edit next)' });
  const prompt = await vscode.window.showInputBox({ prompt: 'Enter prompt', value: promptTemplate?.body ?? '' });
  if (!prompt) return;

  const availableModels = await vscode.lm.selectChatModels();
  const desired = vscode.workspace.getConfiguration('llmCouncil').get<string[]>('defaultModels', []);
  const resolved = pickDefaultModels(desired, availableModels.map(m => ({ id: m.id, quality: m.capabilities?.quality ?? 0 })));
  const modelPick = await vscode.window.showQuickPick(
    availableModels.map(m => ({ label: m.id, picked: resolved.includes(m.id) })), { canPickMany: true, placeHolder: 'Select council models' }
  );
  const models = (modelPick ?? []).map(i => i.label);
  if (models.length === 0) return;
  const chair = models[0];

  const logger = new OutputLogger('LLM Council');
  logger.info(`Models: ${models.join(', ')}`);
  const summaryStore = new HistoryStore(ctx.globalState, vscode.workspace.getConfiguration('llmCouncil').get('historySize', 20));

  const result = await runCouncil({ prompt, contextText: resolvedCtx.kind === 'none' ? undefined : resolvedCtx.text, models, chair }, {
    async chat(model, messages, onToken) {
      const resp = await vscode.lm.sendChatRequest(model as any, messages as any, {}, undefined);
      for await (const chunk of resp.stream ?? []) {
        const text = chunk?.text ?? chunk ?? '';
        if (text) onToken(text);
      }
      return resp.outputText ?? '';
    }
  }, {
    onToken(stage, model, chunk) { logger.stream(stage, model, chunk); }
  });

  logger.info(`Final: ${result.finalAnswer}`);
  await summaryStore.add({ id: Date.now().toString(), prompt, models, finalAnswer: result.finalAnswer, ts: Date.now() });
}
```

`src/extension.ts`: register command to call `runCommand(context)`.

`src/council/outputChannel.ts`: implement `stream(stage, model, chunk)` to append `[stage:model] chunk`.

**Step 4: Run test to verify it passes**

Run: `npm test`

Expected: Integration passes (command executes without throw). Unit tests still pass.

**Step 5: Commit**

```bash
git add src/council/runCommand.ts src/council/outputChannel.ts src/council/modelResolver.ts src/extension.ts src/test/integration/commandFlow.test.ts
git commit -m "feat: wire command flow with LM API, context and history"
```

### Task 7: README and packaging polish

**Files:**
- Modify: `README.md`
- Modify: `.vscodeignore`
- Create: `CHANGELOG.md`

**Step 1: Write the failing test**

No code test; instead add checklist to ensure docs and ignore rules present.

**Step 2: Run test to verify it fails**

Manual verification: README lacks usage instructions; package missing ignore.

**Step 3: Write minimal implementation**

Update `README.md` with usage (right-click -> LLM Council -> choose context -> prompt -> models), LM API requirement (Copilot subscription), streaming behavior, history info.

`.vscodeignore`: ignore `src/**`, `test/**`, `node_modules/**`, `vitest.config.*`, `tsconfig.*`, `.git/**`.

`CHANGELOG.md`: add entry `0.0.1 - Initial council command with streaming and history`.

**Step 4: Run test to verify it passes**

Manual check: `vsce package` dry run (optional) or `npm run compile` succeeds.

**Step 5: Commit**

```bash
git add README.md .vscodeignore CHANGELOG.md
git commit -m "docs: update readme and package ignore"
```

### Verification
- Run full suite: `npm test` (compiles, unit via Vitest, integration via @vscode/test-electron).
- Manual smoke: open VS Code, run from context menu, observe streaming output channel.

---

Plan complete and ready for execution.
