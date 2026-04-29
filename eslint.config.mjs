import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'out/**',
      'node_modules/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-unused-vars': 'off',
      'no-undef': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
    },
  },
  {
    files: ['src/webview/ui/**/*.js'],
    languageOptions: {
      globals: {
        acquireVsCodeApi: 'readonly',
        clearTimeout: 'readonly',
        document: 'readonly',
        DOMParser: 'readonly',
        setTimeout: 'readonly',
        window: 'readonly',
      },
    },
  },
);
