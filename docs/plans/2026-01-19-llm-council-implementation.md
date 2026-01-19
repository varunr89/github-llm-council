# LLM Council Demo Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a flashy 3-column streaming UI where GPT-5, Claude, and Gemini debate hot takes simultaneously.

**Architecture:** Express backend with `/api/council` endpoint that spawns 3 parallel Copilot SDK sessions and multiplexes their SSE streams. Frontend receives tagged events and routes to correct column with glow animations.

**Tech Stack:** Express, @github/copilot-sdk, vanilla JS, CSS animations, SSE

---

### Task 1: Backend - Council Endpoint Structure

**Files:**
- Modify: `src/server.ts:30-68` (add new endpoint after existing ones)

**Step 1: Add the council endpoint skeleton**

Add this after the `/api/stream` endpoint in `src/server.ts`:

```typescript
const COUNCIL_MODELS = [
  { id: "gpt-5", name: "GPT-5" },
  { id: "claude-sonnet", name: "Claude" },
  { id: "gemini-pro", name: "Gemini" },
];

app.post("/api/council", async (req, res) => {
  const prompt = typeof req.body?.prompt === "string" ? req.body.prompt : "";
  if (!prompt.trim()) {
    res.status(400).json({ error: "Prompt is required." });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const sessions = await Promise.all(
    COUNCIL_MODELS.map((model) =>
      client.createSession({ model: model.id, streaming: true })
    )
  );

  let completedCount = 0;

  const unsubscribers = sessions.map((session, index) => {
    const model = COUNCIL_MODELS[index];
    return session.on((event) => {
      if (event.type === "assistant.message_delta") {
        const chunk = event.data.deltaContent ?? "";
        if (chunk) {
          res.write(`data: ${JSON.stringify({ model: model.id, name: model.name, delta: chunk })}\n\n`);
        }
      } else if (event.type === "session.idle") {
        completedCount++;
        res.write(`data: ${JSON.stringify({ model: model.id, name: model.name, done: true })}\n\n`);
        if (completedCount === COUNCIL_MODELS.length) {
          res.write("event: done\ndata: {}\n\n");
          res.end();
        }
      }
    });
  });

  try {
    await Promise.all(sessions.map((session) => session.send({ prompt })));
  } catch (error) {
    res.write(`data: ${JSON.stringify({ error: String(error) })}\n\n`);
    res.end();
  } finally {
    unsubscribers.forEach((unsub) => unsub());
    await Promise.all(sessions.map((session) => session.destroy()));
  }
});
```

**Step 2: Test manually**

Run: `npm run start`

In another terminal:
```bash
curl -X POST http://localhost:3000/api/council \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Is Rust better than Go? Keep it brief."}' \
  --no-buffer
```

Expected: SSE events with `model` field tagging each delta.

**Step 3: Commit**

```bash
git add src/server.ts
git commit -m "feat: add /api/council endpoint for parallel model streaming"
```

---

### Task 2: Frontend - HTML Structure

**Files:**
- Rewrite: `src/public/index.html`

**Step 1: Replace index.html with new structure**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LLM Council</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="container">
    <header class="header">
      <h1 class="title">
        <span class="title-icon">🔮</span>
        LLM COUNCIL
      </h1>
      <a href="https://github.com" class="github-link" target="_blank">
        <svg height="24" viewBox="0 0 16 16" width="24" fill="currentColor">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
        </svg>
      </a>
    </header>

    <div class="input-section">
      <div class="prompt-chips">
        <button class="chip" data-prompt="Is Rust better than Go?">Is Rust better than Go?</button>
        <button class="chip" data-prompt="Tabs or spaces?">Tabs or spaces?</button>
        <button class="chip" data-prompt="Is AI going to replace developers?">AI replacing devs?</button>
        <button class="chip" data-prompt="Vim or Emacs?">Vim or Emacs?</button>
      </div>
      <div class="input-wrapper">
        <input type="text" id="prompt-input" class="prompt-input" placeholder="Ask a spicy question..." value="Is Rust better than Go?">
        <button id="submit-btn" class="submit-btn">⚡</button>
      </div>
    </div>

    <div class="council-grid">
      <div class="council-column" data-model="gpt-5">
        <div class="column-header">
          <span class="model-indicator"></span>
          <span class="model-name">GPT-5</span>
        </div>
        <div class="column-content">
          <div class="response-text"></div>
          <span class="cursor"></span>
        </div>
      </div>

      <div class="council-column" data-model="claude-sonnet">
        <div class="column-header">
          <span class="model-indicator"></span>
          <span class="model-name">CLAUDE</span>
        </div>
        <div class="column-content">
          <div class="response-text"></div>
          <span class="cursor"></span>
        </div>
      </div>

      <div class="council-column" data-model="gemini-pro">
        <div class="column-header">
          <span class="model-indicator"></span>
          <span class="model-name">GEMINI</span>
        </div>
        <div class="column-content">
          <div class="response-text"></div>
          <span class="cursor"></span>
        </div>
      </div>
    </div>
  </div>

  <script src="app.js"></script>
</body>
</html>
```

**Step 2: Verify structure loads**

Run server and open http://localhost:3000 - should see unstyled HTML structure.

**Step 3: Commit**

```bash
git add src/public/index.html
git commit -m "feat: add HTML structure for LLM Council UI"
```

---

### Task 3: Frontend - CSS Dark Hacker Aesthetic

**Files:**
- Create: `src/public/styles.css`

**Step 1: Create the stylesheet**

```css
:root {
  --bg-primary: #0a0a0a;
  --bg-secondary: #111111;
  --bg-tertiary: #1a1a1a;
  --text-primary: #e0e0e0;
  --text-muted: #666666;
  --border-color: #2a2a2a;

  --gpt-color: #00ffff;
  --claude-color: #ff00ff;
  --gemini-color: #00ff88;

  --glow-intensity: 0.6;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'JetBrains Mono', monospace;
  background: var(--bg-primary);
  color: var(--text-primary);
  min-height: 100vh;
  overflow-x: hidden;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Header */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.title {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.title-icon {
  font-size: 1.75rem;
}

.github-link {
  color: var(--text-muted);
  transition: color 0.2s, filter 0.2s;
}

.github-link:hover {
  color: var(--text-primary);
  filter: drop-shadow(0 0 8px currentColor);
}

/* Input Section */
.input-section {
  margin-bottom: 2rem;
}

.prompt-chips {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.chip {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  padding: 0.5rem 1rem;
  border-radius: 9999px;
  font-family: inherit;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
}

.chip:hover {
  border-color: var(--text-muted);
  color: var(--text-primary);
}

.input-wrapper {
  display: flex;
  gap: 1rem;
  position: relative;
}

.prompt-input {
  flex: 1;
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  color: var(--text-primary);
  padding: 1rem 1.5rem;
  font-family: inherit;
  font-size: 1rem;
  border-radius: 8px;
  outline: none;
  transition: all 0.3s;
}

.prompt-input:focus {
  border-color: var(--gpt-color);
  box-shadow: 0 0 20px rgba(0, 255, 255, 0.2);
}

.submit-btn {
  background: linear-gradient(135deg, var(--gpt-color), var(--claude-color));
  border: none;
  color: var(--bg-primary);
  padding: 1rem 2rem;
  font-size: 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: bold;
}

.submit-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 0 30px rgba(0, 255, 255, 0.4);
}

.submit-btn:active {
  transform: scale(0.98);
}

.submit-btn.loading {
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

/* Council Grid */
.council-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  flex: 1;
}

.council-column {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: all 0.3s;
}

.council-column[data-model="gpt-5"] {
  --model-color: var(--gpt-color);
}

.council-column[data-model="claude-sonnet"] {
  --model-color: var(--claude-color);
}

.council-column[data-model="gemini-pro"] {
  --model-color: var(--gemini-color);
}

.council-column.active {
  border-color: var(--model-color);
  box-shadow: 0 0 30px rgba(var(--model-color), 0.2);
}

.council-column.active .column-header {
  background: linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 100%);
}

.column-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border-color);
  transition: background 0.3s;
}

.model-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--model-color);
  opacity: 0.4;
  transition: all 0.3s;
}

.council-column.active .model-indicator {
  opacity: 1;
  box-shadow: 0 0 10px var(--model-color);
  animation: glow-pulse 2s infinite;
}

@keyframes glow-pulse {
  0%, 100% { box-shadow: 0 0 10px var(--model-color); }
  50% { box-shadow: 0 0 20px var(--model-color), 0 0 30px var(--model-color); }
}

.model-name {
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--model-color);
}

.column-content {
  flex: 1;
  padding: 1.25rem;
  overflow-y: auto;
  min-height: 400px;
  position: relative;
}

.response-text {
  line-height: 1.7;
  font-size: 0.9rem;
  color: var(--text-primary);
  white-space: pre-wrap;
}

.response-text .char {
  opacity: 0;
  animation: char-appear 0.1s forwards;
}

@keyframes char-appear {
  from {
    opacity: 0;
    text-shadow: 0 0 10px var(--model-color);
  }
  to {
    opacity: 1;
    text-shadow: none;
  }
}

.cursor {
  display: none;
  width: 2px;
  height: 1.2em;
  background: var(--model-color);
  animation: blink 0.8s infinite;
  vertical-align: text-bottom;
  margin-left: 2px;
  box-shadow: 0 0 8px var(--model-color);
}

.council-column.active .cursor {
  display: inline-block;
}

.council-column.done .cursor {
  display: none;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

/* Flash effect on submit */
.flash {
  animation: flash-effect 0.3s;
}

@keyframes flash-effect {
  0% { filter: brightness(1); }
  50% { filter: brightness(1.5); }
  100% { filter: brightness(1); }
}

/* Error state */
.council-column.error {
  border-color: #ff4444;
}

.council-column.error .model-indicator {
  background: #ff4444;
}

.error-message {
  color: #ff4444;
  font-style: italic;
}

/* Empty state */
.column-content .empty-state {
  color: var(--text-muted);
  font-style: italic;
  opacity: 0.5;
}

/* Disable button when loading */
.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
}
```

**Step 2: Verify styling**

Refresh http://localhost:3000 - should see dark UI with neon accents.

**Step 3: Commit**

```bash
git add src/public/styles.css
git commit -m "feat: add dark hacker aesthetic CSS styling"
```

---

### Task 4: Frontend - JavaScript Streaming Logic

**Files:**
- Create: `src/public/app.js`

**Step 1: Create the JavaScript file**

```javascript
const promptInput = document.getElementById('prompt-input');
const submitBtn = document.getElementById('submit-btn');
const chips = document.querySelectorAll('.chip');
const columns = document.querySelectorAll('.council-column');

const columnMap = {
  'gpt-5': document.querySelector('[data-model="gpt-5"]'),
  'claude-sonnet': document.querySelector('[data-model="claude-sonnet"]'),
  'gemini-pro': document.querySelector('[data-model="gemini-pro"]'),
};

function resetColumns() {
  columns.forEach(col => {
    col.classList.remove('active', 'done', 'error');
    const responseText = col.querySelector('.response-text');
    responseText.textContent = '';
  });
}

function appendCharWithAnimation(column, char) {
  const responseText = column.querySelector('.response-text');
  const span = document.createElement('span');
  span.className = 'char';
  span.textContent = char;
  responseText.appendChild(span);

  // Auto-scroll to bottom
  const content = column.querySelector('.column-content');
  content.scrollTop = content.scrollHeight;
}

function appendTextWithAnimation(column, text) {
  for (const char of text) {
    appendCharWithAnimation(column, char);
  }
}

function showError(column, message) {
  const responseText = column.querySelector('.response-text');
  responseText.textContent = '';
  const errorSpan = document.createElement('span');
  errorSpan.className = 'error-message';
  errorSpan.textContent = message;
  responseText.appendChild(errorSpan);
}

async function submitPrompt() {
  const prompt = promptInput.value.trim();
  if (!prompt) return;

  resetColumns();
  submitBtn.classList.add('loading');
  submitBtn.disabled = true;
  columns.forEach(col => col.classList.add('active'));

  try {
    const response = await fetch('/api/council', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      throw new Error('HTTP ' + response.status);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() || '';

      for (const part of parts) {
        if (part.startsWith('event: done')) {
          return;
        }

        if (part.startsWith('data: ')) {
          try {
            const payload = JSON.parse(part.slice(6));

            if (payload.error) {
              columns.forEach(col => {
                col.classList.remove('active');
                col.classList.add('error');
                showError(col, 'Error: ' + payload.error);
              });
              return;
            }

            const column = columnMap[payload.model];
            if (!column) continue;

            if (payload.delta) {
              appendTextWithAnimation(column, payload.delta);
            }

            if (payload.done) {
              column.classList.remove('active');
              column.classList.add('done');
            }
          } catch (e) {
            console.error('Parse error:', e);
          }
        }
      }
    }
  } catch (error) {
    console.error('Request failed:', error);
    columns.forEach(col => {
      col.classList.remove('active');
      col.classList.add('error');
      showError(col, 'Connection failed');
    });
  } finally {
    submitBtn.classList.remove('loading');
    submitBtn.disabled = false;
  }
}

// Event listeners
submitBtn.addEventListener('click', submitPrompt);

promptInput.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    submitPrompt();
  }
});

chips.forEach(function(chip) {
  chip.addEventListener('click', function() {
    promptInput.value = chip.dataset.prompt;
    promptInput.classList.add('flash');
    setTimeout(function() {
      promptInput.classList.remove('flash');
    }, 300);
  });
});

// Add flash class support to input
promptInput.addEventListener('focus', function() {
  promptInput.classList.add('focused');
});

promptInput.addEventListener('blur', function() {
  promptInput.classList.remove('focused');
});
```

**Step 2: Test the full flow**

1. Restart server: `npm run start`
2. Open http://localhost:3000
3. Click a chip or type a question
4. Click ⚡ button
5. Watch 3 columns stream simultaneously

**Step 3: Commit**

```bash
git add src/public/app.js
git commit -m "feat: add JavaScript streaming logic with animations"
```

---

### Task 5: Final Integration Test

**Step 1: Full restart and test**

```bash
cd /home/varunramesh/projects/copilot-webapp
npm run start
```

**Step 2: Test checklist**

- [ ] Page loads with dark theme
- [ ] Clicking chip fills input
- [ ] Submit streams to all 3 columns
- [ ] Each column has correct color (cyan/magenta/green)
- [ ] Cursors blink during streaming
- [ ] Cursors disappear when done
- [ ] Error state shows on network failure

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: complete LLM Council demo implementation"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Backend council endpoint | `src/server.ts` |
| 2 | HTML structure | `src/public/index.html` |
| 3 | CSS dark aesthetic | `src/public/styles.css` |
| 4 | JS streaming logic | `src/public/app.js` |
| 5 | Integration test | — |

Total: ~5 tasks, bite-sized steps for each.
