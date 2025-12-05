import * as vscode from 'vscode';
import { runCommand } from './council/runCommand';

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('llmCouncil.run', () => runCommand(context));

  context.subscriptions.push(disposable);
}

export function deactivate() {}
