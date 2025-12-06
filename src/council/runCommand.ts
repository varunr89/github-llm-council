import * as vscode from 'vscode';
import { pickDefaultModels, mapAvailableModels } from './modelResolver';
import { chooseContext } from './contextResolver';
import { runCouncil } from './pipeline';
import prompts from '../prompts';
import { OutputLogger } from './outputChannel';
import { HistoryStore } from './historyStore';

type ModelPickItem = vscode.QuickPickItem & { id: string };

export async function runCommand(ctx: vscode.ExtensionContext) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    void vscode.window.showWarningMessage('No active editor for LLM Council.');
    return;
  }

  const selectionText = editor.document.getText(editor.selection);
  const docText = editor.document.getText();

  const contextModePick = await vscode.window.showQuickPick(
    [
      { label: 'File (default)', mode: 'file' as const },
      { label: 'Selection', mode: 'selection' as const },
      { label: 'None', mode: 'none' as const }
    ],
    { placeHolder: 'Pick context', canPickMany: false }
  );
  const resolvedCtx = chooseContext({
    selection: selectionText,
    document: docText,
    mode: (contextModePick?.mode ?? 'file') as any
  });

  const promptTemplate = await vscode.window.showQuickPick(
    prompts.map(p => ({ label: p.title, description: p.body.slice(0, 60), body: p.body })),
    { placeHolder: 'Pick prompt (you can edit next)' }
  );
  const prompt = await vscode.window.showInputBox({
    prompt: 'Enter prompt',
    value: promptTemplate?.body ?? ''
  });
  if (!prompt) return;

  const availableModels = await vscode.lm.selectChatModels();
  const desired = vscode.workspace.getConfiguration('llmCouncil').get<string[]>('defaultModels', []);
  const mapped = mapAvailableModels(availableModels);
  const resolvedDefaults = pickDefaultModels(desired, mapped);

  const modelQuickPickItems: ModelPickItem[] = availableModels.map(m => ({
    id: m.id,
    label: m.id,
    picked: resolvedDefaults.includes(m.id)
  }));
  const modelPick = await vscode.window.showQuickPick<ModelPickItem>(modelQuickPickItems, {
    canPickMany: true,
    placeHolder: 'Select council models'
  });
  const models = (modelPick ?? []).map(i => i.id);
  if (models.length === 0) {
    void vscode.window.showWarningMessage('No models selected for council run.');
    return;
  }
  const chair = models[0];

  const logger = new OutputLogger('LLM Council');
  logger.info(`Models: ${models.join(', ')}`);

  const summaryStore = new HistoryStore(
    ctx.globalState,
    vscode.workspace.getConfiguration('llmCouncil').get('historySize', 20)
  );

  const result = await runCouncil(
    {
      prompt,
      contextText: resolvedCtx.kind === 'none' ? undefined : resolvedCtx.text,
      models,
      chair
    },
    {
      async chat(model, messages, onToken) {
        const chatModel = availableModels.find(m => m.id === model);
        if (!chatModel) {
          throw new Error(`Model not available: ${model}`);
        }
        const resp = await chatModel.sendRequest(messages as any, {}, undefined);
        let collected = '';
        const extractText = (chunk: unknown): string => {
          if (typeof chunk === 'string') return chunk;
          if (chunk && typeof chunk === 'object') {
            const maybeText = (chunk as any).text;
            if (typeof maybeText === 'string') return maybeText;
            const maybeContent = (chunk as any).content;
            if (typeof maybeContent === 'string') return maybeContent;
            if (Array.isArray(maybeContent) && typeof maybeContent[0]?.value === 'string') {
              return maybeContent[0].value;
            }
          }
          return '';
        };
        for await (const chunk of resp.stream ?? []) {
          const text = extractText(chunk);
          if (text) {
            collected += text;
            onToken(text);
          }
        }
        const outputText = (resp as any).outputText;
        return typeof outputText === 'string' && outputText.length > 0 ? outputText : collected;
      }
    },
    {
      onToken(stage, model, chunk) {
        logger.stream(stage, model, chunk);
      }
    }
  );

  logger.info(`Final: ${result.finalAnswer}`);
  await summaryStore.add({
    id: Date.now().toString(),
    prompt,
    models,
    finalAnswer: result.finalAnswer,
    ts: Date.now()
  });
}
