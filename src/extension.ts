import * as vscode from 'vscode';

const STATA_LANGUAGE_ID = 'stata';
const DEFAULT_NOTEBOOK_LANGUAGE_ID = 'python';
const AUTO_SWITCH_FLAG = 'stataMagicAutoSwitched';
const STATA_MAGIC_REGEX = /^\s*%%stata(?:\s+.*)?$/i;
const processingNotebookUris = new Set<string>();

export function activate(context: vscode.ExtensionContext): void {
  const debounced = debounce((notebook: vscode.NotebookDocument) => {
    void processNotebook(notebook);
  }, 120);

  for (const notebook of vscode.workspace.notebookDocuments) {
    if (isJupyterNotebook(notebook)) {
      debounced(notebook);
    }
  }

  context.subscriptions.push(
    vscode.workspace.onDidOpenNotebookDocument((notebook) => {
      if (isJupyterNotebook(notebook)) {
        debounced(notebook);
      }
    }),
    vscode.workspace.onDidChangeNotebookDocument((event) => {
      if (isJupyterNotebook(event.notebook)) {
        debounced(event.notebook);
      }
    })
  );
}

export function deactivate(): void {
  // no-op
}

function isJupyterNotebook(notebook: vscode.NotebookDocument): boolean {
  return notebook.notebookType === 'jupyter-notebook';
}

async function processNotebook(notebook: vscode.NotebookDocument): Promise<void> {
  const notebookUri = notebook.uri.toString();

  if (processingNotebookUris.has(notebookUri)) {
    return;
  }

  processingNotebookUris.add(notebookUri);

  try {
    for (let i = 0; i < notebook.cellCount; i += 1) {
      const cell = notebook.cellAt(i);
      if (cell.kind !== vscode.NotebookCellKind.Code) {
        continue;
      }

      const firstLine = cell.document.lineCount > 0 ? cell.document.lineAt(0).text : '';
      const hasStataMagic = STATA_MAGIC_REGEX.test(firstLine);
      const wasAutoSwitched = Boolean(cell.metadata?.[AUTO_SWITCH_FLAG]);

      if (hasStataMagic && cell.document.languageId !== STATA_LANGUAGE_ID) {
        await updateCellLanguage(notebook, i, STATA_LANGUAGE_ID, true);
        continue;
      }

      if (!hasStataMagic && wasAutoSwitched && cell.document.languageId === STATA_LANGUAGE_ID) {
        await updateCellLanguage(notebook, i, DEFAULT_NOTEBOOK_LANGUAGE_ID, false);
      }
    }
  } finally {
    processingNotebookUris.delete(notebookUri);
  }
}

async function updateCellLanguage(
  notebook: vscode.NotebookDocument,
  index: number,
  language: string,
  autoSwitched: boolean
): Promise<void> {
  const cell = notebook.cellAt(index);
  const nextMetadata = { ...cell.metadata } as Record<string, unknown>;

  if (autoSwitched) {
    nextMetadata[AUTO_SWITCH_FLAG] = true;
  } else {
    delete nextMetadata[AUTO_SWITCH_FLAG];
  }

  const replacement = new vscode.NotebookCellData(
    cell.kind,
    cell.document.getText(),
    language
  );
  replacement.metadata = nextMetadata;
  replacement.outputs = [...cell.outputs];
  replacement.executionSummary = cell.executionSummary;

  const edit = new vscode.WorkspaceEdit();
  edit.set(notebook.uri, [
    vscode.NotebookEdit.replaceCells(
      new vscode.NotebookRange(index, index + 1),
      [replacement]
    )
  ]);
  await vscode.workspace.applyEdit(edit);
}

function debounce<T extends (...args: any[]) => void>(fn: T, waitMs: number): T {
  let timeout: NodeJS.Timeout | undefined;

  return ((...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => fn(...args), waitMs);
  }) as T;
}
