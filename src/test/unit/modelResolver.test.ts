import { describe, it, expect } from 'vitest';
import { pickDefaultModels } from '../../council/modelResolver';

describe('pickDefaultModels', () => {
  const desired = ['gpt-5.1', 'sonnet-4.5', 'gemini-pro-3'];
  const available = [
    { id: 'sonnet-4.5', quality: 0.9 },
    { id: 'other-1', quality: 0.7 },
    { id: 'gpt-5.1', quality: 1 },
    { id: 'gemini-pro-3', quality: 0.8 }
  ];

  it('prefers configured models, fills to three with best available', () => {
    const result = pickDefaultModels(desired, available, 3);
    expect(result).toEqual(['gpt-5.1', 'sonnet-4.5', 'gemini-pro-3']);
  });

  it('falls back when desired missing', () => {
    const result = pickDefaultModels(desired, [{ id: 'sonnet-4.5', quality: 0.9 }], 3);
    expect(result).toEqual(['sonnet-4.5']);
  });
});
