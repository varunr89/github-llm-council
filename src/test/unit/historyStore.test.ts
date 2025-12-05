import { describe, it, expect } from 'vitest';
import { HistoryStore, RunSummary } from '../../council/historyStore';

describe('HistoryStore', () => {
  const base = (id: string): RunSummary => ({
    id,
    prompt: 'p',
    models: [],
    finalAnswer: 'a',
    ts: Date.now()
  });

  it('adds and caps history', () => {
    const mockState = new Map<string, any>();
    const store = new HistoryStore(
      {
        get: k => mockState.get(k),
        update: (_k, v) => {
          mockState.set('llmCouncil.history', v);
        }
      },
      2
    );

    store.add(base('1'));
    store.add(base('2'));
    store.add(base('3'));
    const all = store.all();
    expect(all.length).toBe(2);
    expect(all[0].id).toBe('3');
  });
});
