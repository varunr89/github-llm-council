import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CopilotClient } from "@github/copilot-sdk";

const app = express();
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new CopilotClient();
await client.start();

app.use(express.static(path.join(__dirname, "public")));

app.post("/api/ask", async (req, res) => {
  const prompt = typeof req.body?.prompt === "string" ? req.body.prompt : "";
  if (!prompt.trim()) {
    res.status(400).json({ error: "Prompt is required." });
    return;
  }

  const session = await client.createSession({ model: "gpt-5" });
  const message = await session.sendAndWait({ prompt });
  await session.destroy();

  res.json({ content: message?.data.content ?? "" });
});

app.post("/api/stream", async (req, res) => {
  const prompt = typeof req.body?.prompt === "string" ? req.body.prompt : "";
  if (!prompt.trim()) {
    res.status(400).json({ error: "Prompt is required." });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const session = await client.createSession({ model: "gpt-5", streaming: true });
  const unsubscribe = session.on((event) => {
    if (event.type === "assistant.message_delta") {
      const chunk = event.data.deltaContent ?? "";
      if (chunk) {
        res.write(`data: ${JSON.stringify({ delta: chunk })}\n\n`);
      }
    } else if (event.type === "assistant.message") {
      res.write(`data: ${JSON.stringify({ content: event.data.content })}\n\n`);
    } else if (event.type === "session.idle") {
      res.write("event: done\n");
      res.write("data: {}\n\n");
      res.end();
    }
  });

  try {
    await session.send({ prompt });
  } catch (error) {
    res.write(`data: ${JSON.stringify({ error: String(error) })}\n\n`);
    res.end();
  } finally {
    unsubscribe();
    await session.destroy();
  }
});

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

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";
app.listen(port, host, () => {
  console.log(`Copilot webapp running at http://${host}:${port}`);
});
