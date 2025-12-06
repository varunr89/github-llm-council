import { describe, it, expect } from 'vitest';
import { ChatMessage, LmClient } from '../../council/pipeline';
import { generateSlugFromLLM, sanitizeSlug, timestampSlug } from '../../council/slugger';

class StubClient implements LmClient {
  constructor(private readonly responses: Record<string, string | Error | undefined>) {}

  async chat(model: string, _messages: ChatMessage[], _onToken: (t: string) => void): Promise<string> {
    const resp = this.responses[model];
    if (resp instanceof Error) {
      throw resp;
    }
    return resp ?? '';
  }
}

describe('slugger', () => {
  it('sanitizes raw strings into lowercase hyphen slugs', () => {
    expect(sanitizeSlug('My Awesome Idea!!')).toBe('my-awesome-idea');
    expect(sanitizeSlug('  spaced   out   ')).toBe('spaced-out');
    expect(sanitizeSlug('???')).toBe('');
  });

  it('generates slug from LLM suggestion and falls back on empty result', async () => {
    const client = new StubClient({ model: 'Cool Feature Name' });
    const slug = await generateSlugFromLLM({
      client,
      model: 'model',
      prompt: 'Do the thing',
      contextPreview: 'sample context',
      timestamp: new Date('2024-01-02T03:04:05Z')
    });
    expect(slug).toBe('cool-feature-name');

    const emptyClient = new StubClient({ model: '' });
    const fallback = await generateSlugFromLLM({
      client: emptyClient,
      model: 'model',
      prompt: 'irrelevant',
      timestamp: new Date('2024-01-02T03:04:05Z')
    });
    expect(fallback).toBe('council-20240102-030405');
  });

  it('falls back on errors from the client', async () => {
    const client = new StubClient({ model: new Error('boom') });
    const slug = await generateSlugFromLLM({
      client,
      model: 'model',
      prompt: 'anything',
      timestamp: new Date('2024-02-02T10:11:12Z')
    });
    expect(slug).toBe(timestampSlug(new Date('2024-02-02T10:11:12Z')));
  });
});
