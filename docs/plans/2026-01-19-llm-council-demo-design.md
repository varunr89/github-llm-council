# LLM Council Demo Design

## Overview

A flashy web demo showcasing the GitHub Copilot SDK by implementing an "LLM Council"—3 AI models debating hot takes simultaneously in a dark hacker aesthetic UI.

**Target:** Social media / Twitter-style clip (30 seconds, punchy, shareable)

## Core Concept

User types a spicy question → 3 AI models (GPT-5, Claude, Gemini) stream their takes side-by-side in real-time. Each model has a distinct neon color. The visual of 3 AIs arguing simultaneously is the "wow" moment.

## Layout

```
┌─────────────────────────────────────────────────────────────┐
│  🔮 LLM COUNCIL                              [GitHub logo] │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │  "Is Rust better than Go?"                      [⚡] │   │
│  └─────────────────────────────────────────────────────┘   │
├───────────────────┬───────────────────┬─────────────────────┤
│  ▓ GPT-5          │  ▓ CLAUDE         │  ▓ GEMINI           │
│  ┌─────────────┐  │  ┌─────────────┐  │  ┌─────────────┐    │
│  │ streaming   │  │  │ streaming   │  │  │ streaming   │    │
│  │ response... │  │  │ response... │  │  │ response... │    │
│  │ █           │  │  │ █           │  │  │ █           │    │
│  └─────────────┘  │  └─────────────┘  │  └─────────────┘    │
└───────────────────┴───────────────────┴─────────────────────┘
```

## Visual Style

- **Background:** Pure black `#0a0a0a`
- **Font:** Monospace (JetBrains Mono / Fira Code)
- **Model colors:**
  - GPT-5: Cyan `#00ffff`
  - Claude: Magenta `#ff00ff`
  - Gemini: Green `#00ff88`
- **Effects:** Subtle glow on text, blinking cursor, pulse animations

## Interaction Flow

1. Page loads with glowing input field
2. Pre-loaded prompt chips for quick demos
3. User clicks chip or types custom prompt
4. Submit triggers ⚡ flash animation
5. All 3 columns light up simultaneously
6. Text streams character-by-character with glow effect
7. Blinking cursor follows each stream
8. Completion indicated by subtle glow fade

## Pre-loaded Debate Prompts

- "Is Rust better than Go?"
- "Tabs or spaces?"
- "Is AI going to replace developers?"
- "Vim or Emacs?"
- "Is TypeScript worth the overhead?"

## Technical Architecture

### Backend (Express + Copilot SDK)

**Endpoint:** `POST /api/council`

- Takes `{ prompt: string }` in body
- Spawns 3 parallel Copilot sessions with different models
- Returns multiplexed SSE stream with tagged events

**SSE Event Format:**
```json
{ "model": "gpt-5", "delta": "Rust's ownership..." }
{ "model": "claude-sonnet", "delta": "While Go offers..." }
```

**Model Mapping:**
| Column | Model ID | Color |
|--------|----------|-------|
| GPT-5 | `gpt-5` | Cyan |
| Claude | `claude-sonnet` | Magenta |
| Gemini | `gemini-pro` | Green |

### Frontend

- Single EventSource connection to `/api/council`
- Route events by `model` field to correct column
- Append delta with CSS animation
- Track completion state per model

## File Structure

```
copilot-webapp/
├── src/
│   ├── server.ts          # Express + Copilot SDK
│   └── public/
│       ├── index.html     # Demo UI
│       ├── styles.css     # Dark hacker aesthetic
│       └── app.js         # Frontend logic + animations
└── package.json
```

## Scope Boundaries

**In scope:**
- 3-column streaming UI
- Dark hacker aesthetic
- Pre-loaded prompt chips
- Desktop demo (screen recording)

**Out of scope:**
- Authentication
- History/persistence
- Mobile optimization
- Model selection UI
