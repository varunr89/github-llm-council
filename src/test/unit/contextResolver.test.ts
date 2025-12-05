import { describe, it, expect } from 'vitest';
import { chooseContext, ContextMode } from '../../council/contextResolver';

describe('chooseContext', () => {
  const doc = 'document text';

  it('uses selection when provided', () => {
    const result = chooseContext({ selection: 'sel', document: doc, mode: 'auto' });
    expect(result).toEqual({ kind: 'selection', text: 'sel' });
  });

  it('falls back to file when selection empty', () => {
    const result = chooseContext({ selection: '', document: doc, mode: 'auto' });
    expect(result).toEqual({ kind: 'file', text: doc });
  });

  it('can force none', () => {
    const result = chooseContext({ selection: 'sel', document: doc, mode: 'none' });
    expect(result).toEqual({ kind: 'none' });
  });

  it('respects explicit file mode', () => {
    const result = chooseContext({ selection: 'sel', document: doc, mode: 'file' });
    expect(result).toEqual({ kind: 'file', text: doc });
  });

  it('handles empty document', () => {
    const result = chooseContext({ selection: '', document: '', mode: 'auto' });
    expect(result).toEqual({ kind: 'none' });
  });
});
