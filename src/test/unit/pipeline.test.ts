import { describe, it, expect } from 'vitest';
import { runCouncil, StubLmClient } from '../../council/pipeline';

describe('runCouncil', () => {
  it('produces final answer via chair', async () => {
    const client = new StubLmClient({
      stage1: { a: 'answer A', b: 'answer B' },
      stage2: { a: 'A > B', b: 'B > A' },
      stage3: 'final answer'
    });
    const result = await runCouncil(
      {
        prompt: 'Q',
        contextText: 'CTX',
        models: ['a', 'b'],
        chair: 'a'
      },
      client,
      { onToken: () => {} }
    );
    expect(result.finalAnswer).toBe('final answer');
    expect(result.stage1.a).toBe('answer A');
    expect(result.stage2.b).toBe('B > A');
  });
});
