import * as vscode from 'vscode';
import { pickDefaultModels, mapAvailableModels } from './modelResolver';
import { chooseContext } from './contextResolver';
import { runCouncil, LmClient } from './pipeline';
import prompts from '../prompts';
import { OutputLogger } from './outputChannel';
import { HistoryStore } from './historyStore';
import { generateSlugFromLLM } from './slugger';
import { buildMarkdownArtifact } from './markdownBuilder';
import { writeMarkdownFile } from './fileWriter';

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
  const runId = Date.now().toString();

  const logger = new OutputLogger('LLM Council');
  logger.info(`Starting LLM Council`);
  logger.info(`Models: ${models.join(', ')}`);
  logger.info(`Context: ${resolvedCtx.kind}`);
  const preview = resolvedCtx.kind === 'none' ? '' : (resolvedCtx.text ?? '');
  const previewSnippet = preview.length > 500 ? `${preview.slice(0, 500)}…` : preview;
  logger.info(`Prompt: ${prompt.slice(0, 200)}${prompt.length > 200 ? '…' : ''}`);
  if (resolvedCtx.kind !== 'none') {
    logger.info(`Context length: ${preview.length}, preview:\n${previewSnippet}`);
  } else {
    logger.info('Context is none');
  }

  const summaryStore = new HistoryStore(
    ctx.globalState,
    vscode.workspace.getConfiguration('llmCouncil').get('historySize', 20)
  );

  const lmClient: LmClient = {
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
          const maybeValue = (chunk as any).value;
          if (typeof maybeValue === 'string') return maybeValue;
          const deltaContent = (chunk as any).delta?.content;
          if (typeof deltaContent === 'string') return deltaContent;
          if (Array.isArray(deltaContent) && typeof deltaContent[0]?.text === 'string') {
            return deltaContent[0].text;
          }
          if (Array.isArray(deltaContent) && typeof deltaContent[0]?.value === 'string') {
            return deltaContent[0].value;
          }
          const maybeContent = (chunk as any).content;
          if (typeof maybeContent === 'string') return maybeContent;
          if (Array.isArray(maybeContent) && typeof maybeContent[0]?.text === 'string') {
            return maybeContent[0].text;
          }
          if (Array.isArray(maybeContent) && typeof maybeContent[0]?.value === 'string') {
            return maybeContent[0].value;
          }
          const messageContent = (chunk as any).message?.content;
          if (typeof messageContent === 'string') return messageContent;
          if (Array.isArray(messageContent) && typeof messageContent[0]?.text === 'string') {
            return messageContent[0].text;
          }
          if (Array.isArray(messageContent) && typeof messageContent[0]?.value === 'string') {
            return messageContent[0].value;
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
      if (typeof outputText === 'string' && outputText.length > 0) {
        return outputText;
      }
      if (collected.length > 0) {
        return collected;
      }
      // last resort: stringify first chunk for visibility
      const first = await (async () => {
        for await (const chunk of resp.stream ?? []) {
          return typeof chunk === 'string' ? chunk : JSON.stringify(chunk);
        }
        return '';
      })();
      return first;
    }
  };

  try {
    const result = await runCouncil(
      {
        prompt,
        contextText: resolvedCtx.kind === 'none' ? undefined : resolvedCtx.text,
        models,
        chair
      },
      lmClient,
      {
        onToken(stage, model, chunk) {
          logger.stream(stage, model, chunk);
        }
      }
    );

    logger.info('--- Stage 1 answers ---');
    for (const m of models) {
      logger.info(`[${m}] ${result.stage1[m] ?? '<empty>'}`);
    }

    logger.info('--- Stage 2 reviews ---');
    for (const m of models) {
      logger.info(`[${m}] ${result.stage2[m] ?? '<empty>'}`);
    }

    logger.info(`--- Stage 3 final (chair: ${chair}) ---`);
    logger.info(result.finalAnswer || '<empty>');

    if (!result.finalAnswer) {
      logger.error('Final answer was empty');
    }
    await summaryStore.add({
      id: runId,
      prompt,
      models,
      finalAnswer: result.finalAnswer,
      ts: Date.now()
    });

    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri;
    if (!workspaceRoot) {
      logger.error('No workspace folder available; skipping markdown artifact');
      return;
    }

    try {
      const slug = await generateSlugFromLLM({
        client: lmClient,
        model: chair,
        prompt,
        contextPreview: previewSnippet,
        log: msg => logger.info(msg)
      });

      const artifact = buildMarkdownArtifact({
        slug,
        prompt,
        promptPreview: prompt.slice(0, 200),
        contextPreview: resolvedCtx.kind === 'none' ? undefined : previewSnippet,
        contextKind: resolvedCtx.kind,
        models,
        chairModel: chair,
        stage1: result.stage1,
        stage2: result.stage2,
        finalAnswer: result.finalAnswer,
        timestamp: new Date(),
        version: ctx.extension.packageJSON.version ?? '0.0.0',
        runId
      });

      const targetUri = await writeMarkdownFile(workspaceRoot, artifact.filenameBase, artifact.content);
      logger.info(`Markdown saved to ${targetUri.fsPath ?? targetUri.path ?? targetUri.toString()}`);
      const doc = await vscode.workspace.openTextDocument(targetUri);
      await vscode.window.showTextDocument(doc, { preview: false });
    } catch (err) {
      logger.error('Failed to write markdown artifact', err);
    }
  } catch (err) {
    logger.error('Council run failed', err);
    throw err;
  }
}
