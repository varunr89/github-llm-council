import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildMarkdownArtifact } from '../../council/markdownBuilder';
import { writeMarkdownFile } from '../../council/fileWriter';

const files = new Map<string, Uint8Array>();
const existing = new Set<string>();

vi.mock('vscode', () => {
  const makeUri = (path: string) => ({ path });
  return {
    workspace: {
      fs: {
        async stat(uri: any) {
          if (existing.has(uri.path) || files.has(uri.path)) return {};
          const err: any = new Error('FileNotFound');
          err.code = 'FileNotFound';
          throw err;
        },
        async writeFile(uri: any, data: Uint8Array) {
          files.set(uri.path, data);
          existing.add(uri.path);
        }
      }
    },
    Uri: {
      joinPath(base: any, segment: string) {
        return makeUri(`${base.path}/${segment}`);
      }
    }
  };
});

describe('markdown artifact (node integration style)', () => {
  beforeEach(() => {
    files.clear();
    existing.clear();
  });

  it('builds and writes markdown, preserving final answer', async () => {
    const artifact = buildMarkdownArtifact({
      slug: 'artifact-check',
      prompt: 'Test prompt body',
      promptPreview: 'Test prompt body',
      contextPreview: 'context preview text',
      contextKind: 'selection',
      models: ['m1', 'm2'],
      chairModel: 'm1',
      stage1: { m1: 'stage1-m1', m2: 'stage1-m2' },
      stage2: { m1: 'stage2-m1', m2: 'stage2-m2' },
      finalAnswer: 'final text',
      timestamp: new Date('2024-04-05T06:07:08Z'),
      version: '0.0.1'
    });

    const root = { path: '/root' } as any;
    const target = await writeMarkdownFile(root, artifact.filenameBase, artifact.content);
    const buffer = files.get(target.path);
    expect(buffer).toBeDefined();
    const text = new TextDecoder().decode(buffer);
    expect(text).toContain('Stage 3 Final');
    expect(text).toContain('final text');
  });
});
