export interface DiagnosticMessage {
  line: number;
  column: number;
  length: number;
  message: string;
}

self.onmessage = (event: MessageEvent<string>) => {
  const code = event.data;
  const diagnostics: DiagnosticMessage[] = [];

  code.split('\n').forEach((lineText, index) => {
    const match = lineText.match(/\berro\b/);
    if (match && match.index !== undefined) {
      diagnostics.push({
        line: index + 1,
        column: match.index + 1,
        length: match[0].length,
        message: "uso da palavra 'erro' (diagnóstico de teste do spike)",
      });
    }
  });

  self.postMessage(diagnostics);
};
