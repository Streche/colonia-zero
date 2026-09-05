import type { languages } from 'monaco-editor';

export const LANGUAGE_ID = 'pyra-spike';

export const languageConfiguration: languages.LanguageConfiguration = {
  comments: { lineComment: '#' },
  brackets: [['(', ')']],
  autoClosingPairs: [
    { open: '(', close: ')' },
    { open: '"', close: '"' },
  ],
};

export const monarchLanguage: languages.IMonarchLanguage = {
  keywords: ['se', 'senao', 'enquanto', 'funcao', 'mover', 'coletar', 'retorna'],
  tokenizer: {
    root: [
      [/[a-zA-Z_]\w*/, { cases: { '@keywords': 'keyword', '@default': 'identifier' } }],
      [/\d+/, 'number'],
      [/".*?"/, 'string'],
      [/#.*$/, 'comment'],
      [/[()]/, '@brackets'],
    ],
  },
};
