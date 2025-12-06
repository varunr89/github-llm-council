import { describe, it, expect } from 'vitest';
import { buildMarkdownArtifact } from '../../council/markdownBuilder';

const baseInput = {
  slug: 'cool-thing',
  prompt: 'Solve the puzzle',
  promptPreview: 'Solve the puzzle',
  contextPreview: 'context snippet',
  contextKind: 'selection' as const,
  models: ['gpt-5.1', 'claude-3'],
  chairModel: 'gpt-5.1',
  stage1: { 'gpt-5.1': 'S1 answer', 'claude-3': 'S1 alt' },
  stage2: { 'gpt-5.1': 'S2 review', 'claude-3': 'S2 alt review' },
  finalAnswer: 'Final text',
  timestamp: new Date('2024-03-04T05:06:07Z'),
  version: '0.0.1'
};

describe('buildMarkdownArtifact', () => {
  it('builds markdown content with front matter and sections', () => {
    const { filenameBase, content } = buildMarkdownArtifact(baseInput);
    expect(filenameBase).toBe('cool-thing');
    expect(content).toContain('title: "cool-thing"');
    expect(content).toContain('timestamp: "2024-03-04T05:06:07.000Z"');
    expect(content).toContain('models: ["gpt-5.1","claude-3"]');
    expect(content).toContain('chairModel: "gpt-5.1"');
    expect(content).toContain('contextKind: "selection"');
    expect(content).toContain('promptPreview: "Solve the puzzle"');
    expect(content).toContain('contextPreview: "context snippet"');
    expect(content).toContain('## Prompt');
    expect(content).toContain('Solve the puzzle');
    expect(content).toContain('## Stage 1 Answers');
    expect(content).toContain('### gpt-5.1');
    expect(content).toContain('S1 answer');
    expect(content).toContain('## Stage 2 Reviews');
    expect(content).toContain('S2 review');
    expect(content).toContain('## Stage 3 Final (chair: gpt-5.1)');
    expect(content).toContain('Final text');
  });

  it('renders placeholder when context is missing', () => {
    const { content } = buildMarkdownArtifact({ ...baseInput, contextPreview: undefined, contextKind: 'none' });
    expect(content).toContain('_No context provided_');
  });
});
