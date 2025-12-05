export type ContextMode = 'auto' | 'file' | 'selection' | 'none';
export type ResolvedContext =
  | { kind: 'none' }
  | { kind: 'file' | 'selection'; text: string };

export function chooseContext(input: { selection: string; document: string; mode: ContextMode }): ResolvedContext {
  if (input.mode === 'none') {
    return { kind: 'none' };
  }
  if (input.mode === 'selection' && input.selection) {
    return { kind: 'selection', text: input.selection };
  }
  if (input.mode === 'file') {
    return { kind: 'file', text: input.document };
  }
  if (input.selection) {
    return { kind: 'selection', text: input.selection };
  }
  return input.document ? { kind: 'file', text: input.document } : { kind: 'none' };
}
