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
