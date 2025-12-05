import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Tests', () => {
  test('registers llmCouncil.run command', async () => {
    const extension = vscode.extensions.getExtension('your-name-here.llm-council');
    await extension?.activate();
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('llmCouncil.run'));
  });
});
