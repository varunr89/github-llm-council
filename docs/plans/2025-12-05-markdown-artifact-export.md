# Markdown Artifact Export Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Emit a Markdown artifact after each council run with full transcripts and metadata, saved to the workspace root under an LLM-generated slug filename, while keeping the existing streaming Output channel behavior.

**Architecture:** After the pipeline completes, invoke a slug generator (LLM + sanitizer) and a Markdown builder that formats front matter plus per-stage transcripts. Save the file (handling name collisions), open it in a new editor tab, and log the path. Use existing runCommand → pipeline flow; no new UI.

**Tech Stack:** TypeScript, VS Code extension API (lm, workspace.fs, window), Vitest for unit tests, @vscode/test-electron for integration smoke.

---

## Design (agreed)
- Capture data: models list, chair, context kind, prompt text, context preview, stage 1 map, stage 2 map, stage 3 final, timestamp.
- Slug generation: short prompt to an LM (chair preferred, else first model) → sanitize to `[a-z0-9-]`, fallback to timestamp if empty/timeout; log suggestion and final slug.
- Markdown format: YAML front matter with metadata, then sections for Prompt, Context Preview, Stage 1 Answers (per model), Stage 2 Reviews (per model), Stage 3 Final (chair), Models Used. Full transcripts (no truncation). Overwrite or suffix with `-1`, `-2`, … on collision.
- File handling: save to workspace root, UTF-8; open with `window.showTextDocument`; log errors but never block Output streaming.

---

## Tasks

### Task 1: Slug generator helper
**Files:**
- Create: `src/council/slugger.ts`
- Test: `src/test/unit/slugger.test.ts`

**Step 1: Write failing test** for `generateSlugFromLLM` (handles LM suggestion, sanitization, collision suffix helper) and fallback on error/empty.
**Step 2: Run test to see it fail**: `npm run test:unit -- slugger.test.ts`
**Step 3: Implement helper** using chair/first model, 3s timeout, sanitize, fallback to timestamp.
**Step 4: Re-run test to pass**: same command.

### Task 2: Markdown builder helper
**Files:**
- Create: `src/council/markdownBuilder.ts`
- Test: `src/test/unit/markdownBuilder.test.ts`

**Step 1: Write failing test** covering front matter keys, section order, per-model blocks, empty final handling, collision suffix logic stubbed.
**Step 2: Run test (fail)**: `npm run test:unit -- markdownBuilder.test.ts`
**Step 3: Implement builder** that accepts run data + slug + version, returns `{content, filenameBase}` and lets caller pass resolved path.
**Step 4: Re-run test (pass)**.

### Task 3: File writer & collision handling
**Files:**
- Create: `src/council/fileWriter.ts`
- Test: `src/test/unit/fileWriter.test.ts`

**Step 1: Write failing test** for collision suffixing (`foo.md`, `foo-1.md`...), and error bubbling.
**Step 2: Run test (fail)**.
**Step 3: Implement `writeMarkdownFile(workspace, filename, content)` using `workspace.fs` with existence check and suffixing.
**Step 4: Re-run test (pass)**.

### Task 4: Integrate into runCommand flow
**Files:**
- Modify: `src/council/runCommand.ts` (after pipeline completion)
- Modify if needed: `src/council/pipeline.ts` (ensure transcripts exposed)
- Modify if needed: `src/council/historyStore.ts` (store path? optional)
- Modify: `src/prompts.ts` (add slug prompt template)

**Step 1: Add failing integration test** capturing markdown creation and opening: `src/test/integration` (or unit with workspace fs mock).
**Step 2: Run integration (fail)**: `npm run test:integration`
**Step 3: Wire flow**: call slugger with prompt/context preview; call builder with pipeline results; call fileWriter; open with `window.showTextDocument`; log path; non-blocking error handling.
**Step 4: Re-run integration (pass)**.

### Task 5: End-to-end sanity
**Files:**
- Modify/create: `src/test/integration/markdownArtifact.test.ts`

**Step 1: Add test** that simulates a council run with stubbed LM responses and asserts file creation/open path.
**Step 2: Run test (fail)**: `npm run test:integration`
**Step 3: Adjust mocks/helpers** until pass.

### Task 6: Lint and full test suite
**Files:** none (commands)

**Step 1: Run lint**: `npm run lint` (fix if needed).
**Step 2: Run full tests**: `npm test`.
**Step 3: Commit**: `git add . && git commit -m "feat: emit markdown artifact per run"`.

---

Plan complete and ready for execution. Two execution options:
1) Subagent-Driven (this session) — use superpowers:subagent-driven-development.
2) Parallel Session — new session with superpowers:executing-plans.

Which approach?**
