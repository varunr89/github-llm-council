type StageMap = Record<string, string>;

export type MarkdownArtifactInput = {
  slug: string;
  prompt: string;
  promptPreview: string;
  contextPreview?: string;
  contextKind: string;
  models: string[];
  chairModel: string;
  stage1: StageMap;
  stage2: StageMap;
  finalAnswer: string;
  timestamp: Date;
  version: string;
  runId?: string;
};

function quote(value: string) {
  return JSON.stringify(value ?? '');
}

function renderBlock(text: string) {
  return `\`\`\`\n${text || '<empty>'}\n\`\`\``;
}

function renderStage(title: string, models: string[], stage: StageMap) {
  const parts = [`## ${title}`];
  for (const model of models) {
    parts.push(`### ${model}`);
    parts.push(renderBlock(stage[model] ?? '<empty>'));
  }
  return parts.join('\n\n');
}

export function buildMarkdownArtifact(input: MarkdownArtifactInput): { filenameBase: string; content: string } {
  const frontMatterLines = [
    '---',
    `title: ${quote(input.slug)}`,
    `timestamp: ${quote(input.timestamp.toISOString())}`,
    `version: ${quote(input.version)}`,
    `models: [${input.models.map(quote).join(',')}]`,
    `chairModel: ${quote(input.chairModel)}`,
    `contextKind: ${quote(input.contextKind)}`,
    `promptPreview: ${quote(input.promptPreview)}`,
    `contextPreview: ${quote(input.contextPreview ?? '')}`,
    input.runId ? `runId: ${quote(input.runId)}` : undefined,
    '---'
  ].filter(Boolean);

  const sections: string[] = [
    '## Prompt',
    renderBlock(input.prompt),
    '## Context Preview',
    input.contextPreview ? renderBlock(input.contextPreview) : '_No context provided_',
    renderStage('Stage 1 Answers', input.models, input.stage1),
    renderStage('Stage 2 Reviews', input.models, input.stage2),
    `## Stage 3 Final (chair: ${input.chairModel})`,
    renderBlock(input.finalAnswer || '<empty>'),
    '## Models Used',
    input.models.map(m => `- ${m}`).join('\n')
  ];

  const content = [...frontMatterLines, '', ...sections].join('\n');
  return { filenameBase: input.slug, content };
}
