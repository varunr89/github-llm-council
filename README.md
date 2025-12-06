# LLM Council (VS Code Extension)

Minimal, streaming “council” workflow using the VS Code Language Model API (e.g., Copilot models). Runs three stages, logs streams, and saves a markdown artifact per run.

Current state
- Command: `LLM Council` (editor context menu / `llmCouncil.run`).
- Flow: pick context (file/selection/none) → pick prompt template → edit prompt → pick models (defaults auto-resolved and remembered per workspace) → council runs (3 stages) with streaming output.
- Models: via `vscode.lm.selectChatModels`; defaults prefer `gpt-5.1`, `sonnet-4.5`, `gemini-pro-3` when available.
- Output: streams tagged by stage/model; a markdown artifact (with front matter + transcripts) is saved to the workspace root and opened in a new tab. History kept in global storage (`llmCouncil.historySize`).
- Tests: unit/integration via Vitest.

## Installation
Prereqs: VS Code ≥1.84, VS Code CLI `code` on PATH, Copilot (or other LM API provider) with chat models enabled.

Dev/local install
```bash
npm install                 # install deps
npm run package:vsix        # builds dist/llm-council.vsix
code --install-extension dist/llm-council.vsix --force  # install into VS Code
# Optional: npm pack  # to produce github-llm-council-0.0.1.tgz
```

User install after publish
```bash
npm install -g github-llm-council   # postinstall auto-installs the bundled VSIX via `code`
```

Upgrade
```bash
npm update -g github-llm-council    # or npm install -g github-llm-council@latest
```

Publish (maintainers)
```bash
npm install
npm run package:vsix   # produce dist/llm-council.vsix
npm pack               # produce github-llm-council-0.0.1.tgz
npm publish            # prepublishOnly rebuilds/package before publish
```

## Usage
1) Right-click in an editor → `LLM Council` (or run via Command Palette).
2) Choose context (file/selection/none).
3) Pick a prompt template, then edit/enter your prompt.
4) Confirm model selection (defaults pre-selected and remembered per workspace).
5) Watch streaming output; a markdown artifact opens and saves to the workspace root.

Requires: VS Code with LM API-capable extension (e.g., GitHub Copilot) and access to chat models.

## Configuration
- `llmCouncil.defaultModels` (array): preferred model ids; first available three are used when no stored selection exists.
- `llmCouncil.historySize` (number): maximum run summaries to retain.

## Testing
```bash
npm run lint
npm run test:unit
npm run test:integration
```

## Notes
- Model choices are remembered per workspace between runs.
- Prompts live in `src/prompts.ts`; edit and rebuild/package to distribute changes.
