import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { buildMarkdownArtifact } from '../../council/markdownBuilder';
import { writeMarkdownFile } from '../../council/fileWriter';

suite('Markdown artifact integration', () => {
  test('writes markdown artifact to workspace and can open it', async () => {
    const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'llm-council-'));
    const root = vscode.Uri.file(tempDir);
    const existing = vscode.workspace.workspaceFolders ?? [];
    if (existing.length === 0 || existing[0].uri.fsPath !== root.fsPath) {
      vscode.workspace.updateWorkspaceFolders(0, existing.length, { uri: root });
    }

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

    const target = await writeMarkdownFile(root, artifact.filenameBase, artifact.content);
    const doc = await vscode.workspace.openTextDocument(target);
    const text = doc.getText();
    assert.ok(text.includes('Stage 3 Final'), 'artifact should include final section');
    assert.ok(text.includes('final text'), 'artifact should contain final answer text');
  });
});
