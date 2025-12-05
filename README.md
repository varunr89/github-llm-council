# LLM Council (VS Code Extension)

Minimal scaffolding for an LLM council extension using the VS Code Language Model API.

Current state:
- Command: `LLM Council` in the editor context menu (`llmCouncil.run`).
- Flow: choose context (file/selection/none) → pick prompt template → enter prompt → pick models (defaults auto-resolved) → council runs (3 stages) with streaming output tagged by stage/model.
- Models: uses VS Code LM API (e.g., Copilot) via `vscode.lm.selectChatModels`; defaults prefer `gpt-5.1`, `sonnet-4.5`, `gemini-pro-3` when available.
- Output: streams to an output channel; summaries saved to history (global storage) capped by `llmCouncil.historySize`.
- Tests: unit via Vitest, integration via `@vscode/test-electron`.

## Usage
1) Right-click in an editor → `LLM Council`.
2) Choose context (default: file; can switch to selection or none).
3) Pick a prompt template, then edit/enter your prompt.
4) Confirm model selection (defaults pre-selected based on availability).
5) Watch streaming results in the output channel; final answer logged.

Requires: VS Code with LM API-capable extension (e.g., GitHub Copilot) and access to chat models.
