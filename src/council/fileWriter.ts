import * as vscode from 'vscode';

type FileWriterDeps = {
  fs: Pick<typeof vscode.workspace.fs, 'stat' | 'writeFile'>;
  joinPath: typeof vscode.Uri.joinPath;
};

const encoder = new TextEncoder();

async function fileExists(fs: FileWriterDeps['fs'], uri: vscode.Uri): Promise<boolean> {
  try {
    await fs.stat(uri);
    return true;
  } catch (err: any) {
    if (err?.code === 'FileNotFound') {
      return false;
    }
    throw err;
  }
}

export async function writeMarkdownFile(
  rootUri: vscode.Uri,
  filenameBase: string,
  content: string,
  deps: FileWriterDeps = { fs: vscode.workspace.fs, joinPath: vscode.Uri.joinPath }
): Promise<vscode.Uri> {
  const maxAttempts = 50;
  for (let i = 0; i < maxAttempts; i++) {
    const suffix = i === 0 ? '' : `-${i}`;
    const filename = `${filenameBase}${suffix}.md`;
    const target = deps.joinPath(rootUri, filename);
    const exists = await fileExists(deps.fs, target);
    if (exists) {
      continue;
    }
    await deps.fs.writeFile(target, encoder.encode(content));
    return target;
  }
  throw new Error('Unable to find available filename for markdown artifact');
}
