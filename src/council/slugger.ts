import { ChatMessage, LmClient } from './pipeline';
import { slugPrompt } from '../prompts';

type SluggerOptions = {
  client: LmClient;
  model: string;
  prompt: string;
  contextPreview?: string;
  timestamp?: Date;
  timeoutMs?: number;
  log?: (msg: string) => void;
};

export function sanitizeSlug(raw: string): string {
  const lowered = raw.trim().toLowerCase();
  const replaced = lowered.replace(/[^a-z0-9]+/g, '-');
  const squashed = replaced.replace(/-+/g, '-').replace(/^-+|-+$/g, '');
  return squashed.slice(0, 80);
}

export function timestampSlug(ts = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = ts.getUTCFullYear();
  const month = pad(ts.getUTCMonth() + 1);
  const day = pad(ts.getUTCDate());
  const hour = pad(ts.getUTCHours());
  const min = pad(ts.getUTCMinutes());
  const sec = pad(ts.getUTCSeconds());
  return `council-${year}${month}${day}-${hour}${min}${sec}`;
}

export async function generateSlugFromLLM(options: SluggerOptions): Promise<string> {
  const { client, model, prompt, contextPreview, log, timeoutMs = 3000 } = options;
  const fallback = timestampSlug(options.timestamp);
  const messages: ChatMessage[] = [
    { role: 'system', content: slugPrompt },
    {
      role: 'user',
      content: `Prompt: ${prompt}\nContext preview: ${contextPreview ?? '<none>'}`
    }
  ];

  const onToken = () => {};
  try {
    const suggestion = await Promise.race<string>([
      client.chat(model, messages, onToken),
      new Promise<string>((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs))
    ]);
    const sanitized = sanitizeSlug(suggestion);
    if (sanitized) {
      log?.(`Slug suggestion "${suggestion}" => "${sanitized}"`);
      return sanitized;
    }
    log?.(`Slug suggestion was empty; using fallback ${fallback}`);
    return fallback;
  } catch (err: any) {
    log?.(`Slug generation failed: ${err?.message ?? String(err)}`);
    return fallback;
  }
}
