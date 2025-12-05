import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('llmCouncil.run', () => {
    vscode.window.showInformationMessage('LLM Council placeholder');
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}
