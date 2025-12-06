import { describe, it, expect, vi, beforeEach } from 'vitest';

const written = new Map<string, Uint8Array>();
const existing = new Set<string>();
const makeUri = (path: string) => ({ path });

vi.mock('vscode', () => ({
  workspace: {
    fs: {
      async stat(uri: any) {
        if (existing.has(uri.path) || written.has(uri.path)) return {};
        const err: any = new Error('FileNotFound');
        err.code = 'FileNotFound';
        throw err;
      },
      async writeFile(uri: any, data: Uint8Array) {
        written.set(uri.path, data);
        existing.add(uri.path);
      }
    }
  },
  Uri: {
    joinPath(base: any, segment: string) {
      return makeUri(`${base.path}/${segment}`);
    }
  }
}));

import { writeMarkdownFile } from '../../council/fileWriter';

describe('writeMarkdownFile', () => {
  beforeEach(() => {
    written.clear();
    existing.clear();
  });

  it('writes markdown to the first available filename', async () => {
    const root = makeUri('/root');
    const uri = await writeMarkdownFile(root as any, 'note', 'hello world');
    expect(uri.path).toBe('/root/note.md');
    expect(written.has('/root/note.md')).toBe(true);
  });

  it('appends numeric suffix on collision', async () => {
    const root = makeUri('/root');
    existing.add('/root/note.md');
    const uri = await writeMarkdownFile(root as any, 'note', 'second');
    expect(uri.path).toBe('/root/note-1.md');
    expect(written.has('/root/note-1.md')).toBe(true);
  });
});
