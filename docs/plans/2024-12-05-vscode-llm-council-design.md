# VS Code LLM Council Extension — Minimal Design (Command Palette + Output Channel)

## Scope & User Flow
- Trigger: editor context menu item “LLM Council” (on right-click). Primary command id: `llmCouncil.run`.
- Flow: user right-clicks → picks context via quick-pick (default whole file; can switch to selection or none). Then prompt input box (seeded with default templates). Then model quick-pick preselected with resolved defaults.
- Default context policy: use selection if non-empty; else whole active document; user can override to none.
- Models: prefer latest from each provider (target: gpt-5.1, Sonnet 4.5, Gemini Pro 3). At activation, resolve best-available three via `vscode.lm.selectChatModels()`. If configured defaults missing at run time, prompt user to choose available models.
- Output: single dedicated output channel for streaming logs/results. No webview. Stage-tagged streaming: Stage 1 (answers), Stage 2 (reviews/ranks), Stage 3 (chair synthesis).
- History: persist compact run summaries (prompt, context type, models, timestamps, final answer, maybe ranking) to global storage JSON with size cap.

## Architecture
- Activation: contributes editor context menu command `llmCouncil.run`.
- Command handler builds `RunConfig` (prompt, context type, resolved context text, selected models).
- Model resolver: on activation, call `vscode.lm.selectChatModels()`; prefer configured IDs (gpt-5.1, Sonnet 4.5, Gemini Pro 3). If fewer than three match, fill with best available up to three. Store resolved defaults in memory. At run time, if a chosen model is unavailable, re-open quick-pick to pick from available models.
- Context resolver: compute default context (selection → file → none override). Include in user prompt payload when present.
- Output channel manager: create named channel; helper to log with `[stage:modelId]` tags; supports streaming token append.
- Council runner: orchestrates 3 stages, handles cancellation tokens, logs timings/errors, streams per stage.
- History store: write summaries to `globalState` with cap and GC; include prompt hash to avoid unbounded growth.
- Settings: default models array (string IDs), history size cap, auto-context default toggle, default prompt templates.

## Council Pipeline & Prompts
- Shared system prompt template: “You are model {modelId} in a multi-model council. Respond concisely.”
- Stage 1 (independent answers): send same messages (system + user prompt + context) to each selected model with `sendChatRequest`. Stream tokens to output channel with `[S1:modelId]` prefix. Collect full answers.
- Stage 2 (peer review/ranking): for each model, build messages including all Stage 1 answers tagged by model. Ask for brief ranking with strengths/weaknesses. Run in parallel; stream `[S2:modelId]`. Parse simple numeric ranks if possible; otherwise keep text feedback.
- Stage 3 (chair synthesis): chair = first selected model. Provide original prompt/context, Stage 1 answers, and Stage 2 feedback summaries. Ask for final answer + short rationale + perceived best source. Stream `[S3:chair]`. If chair fails, fall back to top-ranked Stage 1 answer.
- Errors: if a model errors mid-stage, log `[error:stage:modelId]` and continue. If all Stage 1 fail, abort. If chair fails, use fallback as above.

## UX Decisions Recap
- Minimal surface: no webview; output channel only.
- Right-click context menu is primary entry.
- Streaming output preferred; concise tags for readability.
- Defaults auto-resolved; user can override via quick-pick when running.
- Persist small run history; recall from global storage later (optional future UI).

## Open Questions / Next Steps
- Confirm exact default prompt templates to ship (e.g., “Explain”, “Debug”, “Review code”, “Summarize”).
- Decide history recall UX (command to list recent runs?).
- Chair selection: stick with first selected, or prefer highest-quality model when available?
