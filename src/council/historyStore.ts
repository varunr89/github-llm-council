export type RunSummary = { id: string; prompt: string; models: string[]; finalAnswer: string; ts: number };

type Memento = { get(key: string): any; update(key: string, value: any): Thenable<void> | void };

export class HistoryStore {
  private key = 'llmCouncil.history';

  constructor(private memento: Memento, private cap: number) {}

  add(summary: RunSummary) {
    const items = this.all();
    const updated = [summary, ...items].slice(0, this.cap);
    return this.memento.update(this.key, updated);
  }

  all(): RunSummary[] {
    return (this.memento.get(this.key) as RunSummary[] | undefined) ?? [];
  }
}
