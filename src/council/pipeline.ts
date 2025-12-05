export type RunInputs = { prompt: string; contextText?: string; models: string[]; chair: string };
export type StageResult = { stage1: Record<string, string>; stage2: Record<string, string>; finalAnswer: string };
export type TokenSink = { onToken: (stage: string, model: string, chunk: string) => void };

export type ChatMessage = { role: 'user' | 'system'; content: string };

export interface LmClient {
  chat(model: string, messages: ChatMessage[], onToken: (t: string) => void): Promise<string>;
}

export async function runCouncil(input: RunInputs, client: LmClient, sink: TokenSink): Promise<StageResult> {
  const baseMessages: ChatMessage[] = [
    { role: 'system', content: `You are participating in a council with: ${input.models.join(', ')}` },
    { role: 'user', content: input.prompt + (input.contextText ? `\nContext:\n${input.contextText}` : '') }
  ];

  const stage1Entries = await Promise.all(
    input.models.map(async m => {
      let text = '';
      const resp = await client.chat(m, baseMessages, chunk => {
        text += chunk;
        sink.onToken('S1', m, chunk);
      });
      return [m, resp ?? text] as const;
    })
  );
  const stage1: Record<string, string> = Object.fromEntries(stage1Entries);

  const stage2Entries = await Promise.all(
    input.models.map(async m => {
      let text = '';
      const review = await client.chat(
        m,
        [
          { role: 'system', content: 'Review answers and identify the strongest response.' },
          { role: 'user', content: JSON.stringify(stage1) }
        ],
        chunk => {
          text += chunk;
          sink.onToken('S2', m, chunk);
        }
      );
      return [m, review ?? text] as const;
    })
  );
  const stage2: Record<string, string> = Object.fromEntries(stage2Entries);

  let finalText = '';
  const finalAnswer = await client.chat(
    input.chair,
    [
      { role: 'system', content: 'Synthesize the best answer concisely.' },
      {
        role: 'user',
        content: JSON.stringify({ prompt: input.prompt, context: input.contextText, stage1, stage2 })
      }
    ],
    chunk => {
      finalText += chunk;
      sink.onToken('S3', input.chair, chunk);
    }
  );

  const final = finalAnswer ?? finalText;
  return { stage1, stage2, finalAnswer: final };
}

export class StubLmClient implements LmClient {
  constructor(private scripted: { stage1: Record<string, string>; stage2: Record<string, string>; stage3: string }) {}
  async chat(model: string, messages: any, onToken: (t: string) => void): Promise<string> {
    const firstContent: string | undefined = messages?.[0]?.content;
    if (firstContent && typeof firstContent === 'string' && firstContent.includes('Synthesize')) {
      onToken(this.scripted.stage3);
      return this.scripted.stage3;
    }
    if (firstContent && typeof firstContent === 'string' && firstContent.includes('Review') && this.scripted.stage2[model]) {
      const v = this.scripted.stage2[model];
      onToken(v);
      return v;
    }
    if (this.scripted.stage1[model]) {
      const v = this.scripted.stage1[model];
      onToken(v);
      return v;
    }
    if (this.scripted.stage2[model]) {
      const v = this.scripted.stage2[model];
      onToken(v);
      return v;
    }
    const v = this.scripted.stage3;
    onToken(v);
    return v;
  }
}
