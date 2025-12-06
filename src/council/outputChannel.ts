import * as vscode from 'vscode';

export class OutputLogger {
  private channel: vscode.OutputChannel;

  constructor(name: string) {
    this.channel = vscode.window.createOutputChannel(name);
  }

  info(message: string) {
    this.channel.appendLine(message);
    this.channel.show(true);
  }

  stream(stage: string, model: string, chunk: string) {
    if (!chunk) return;
    this.channel.append(`[${stage}:${model}] ${chunk}`);
  }

  error(message: string, err?: unknown) {
    const details = err instanceof Error ? `${err.message}\n${err.stack ?? ''}` : `${err ?? ''}`;
    this.channel.appendLine(`[error] ${message}${details ? `: ${details}` : ''}`);
    this.channel.show(true);
  }
}
