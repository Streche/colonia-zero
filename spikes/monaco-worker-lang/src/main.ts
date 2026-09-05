import * as monaco from 'monaco-editor';
import { LANGUAGE_ID, languageConfiguration, monarchLanguage } from './pyra-spike-language';
import type { DiagnosticMessage } from './worker';

monaco.languages.register({ id: LANGUAGE_ID });
monaco.languages.setLanguageConfiguration(LANGUAGE_ID, languageConfiguration);
monaco.languages.setMonarchTokensProvider(LANGUAGE_ID, monarchLanguage);

const container = document.getElementById('editor');
if (!container) throw new Error('#editor element not found');

const editor = monaco.editor.create(container, {
  value: 'funcao coletar_tudo()\n    mover(1)\n    erro_de_teste()\n',
  language: LANGUAGE_ID,
  theme: 'vs-dark',
});

const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });

worker.onmessage = (event: MessageEvent<DiagnosticMessage[]>) => {
  const model = editor.getModel();
  if (!model) return;
  const markers: monaco.editor.IMarkerData[] = event.data.map((d) => ({
    severity: monaco.MarkerSeverity.Warning,
    startLineNumber: d.line,
    startColumn: d.column,
    endLineNumber: d.line,
    endColumn: d.column + d.length,
    message: d.message,
  }));
  monaco.editor.setModelMarkers(model, LANGUAGE_ID, markers);
};

function requestDiagnostics() {
  worker.postMessage(editor.getValue());
}

editor.onDidChangeModelContent(() => requestDiagnostics());
requestDiagnostics();

(window as unknown as { __spikeReady: boolean }).__spikeReady = true;
console.log('Spike B ready: Monaco editor with custom language + worker diagnostics.');
