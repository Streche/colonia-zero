// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    ignores: ['**/dist/**', '**/.turbo/**', '**/node_modules/**'],
  },
  {
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['spikes/monaco-worker-lang/src/**/*.ts'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.worker },
    },
  },
);
