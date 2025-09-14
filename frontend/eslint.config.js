// ESLint Flat Config
import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import path from 'node:path';

export default [
  { ignores: ['dist', 'node_modules'] },
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parser: tsParser,
      parserOptions: {
        project: false,
        ecmaFeatures: { jsx: true },
      },
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        alert: 'readonly',
        console: 'readonly',
        JSX: 'readonly',
        HTMLElement: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      react,
      'react-hooks': reactHooks,
    },
    settings: {
      react: { version: 'detect' },
      'import/resolver': {
        typescript: {
          project: path.resolve(process.cwd(), 'tsconfig.json'),
        },
      },
    },
    rules: {
      // TypeScript ESLint 推奨ルールのベースを取り込む
      ...(tsPlugin.configs?.recommended?.rules ?? {}),
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/jsx-uses-react': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-empty': 'off',
      'no-alert': 'off',
    },
  },
  // Node 環境の設定（設定/ビルド関連ファイル）
  {
    files: [
      'eslint.config.js',
      'vite.config.*',
      'tailwind.config.*',
      'postcss.config.*',
      'tsconfig*.json',
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        process: 'readonly',
        __dirname: 'readonly',
        module: 'readonly',
        require: 'readonly',
        URL: 'readonly',
        console: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-empty': 'off',
    },
  },
  // 型定義ファイルは定義スタイルの強制を緩める
  {
    files: ['**/*.d.ts'],
    rules: {
      '@typescript-eslint/consistent-type-definitions': 'off',
    },
  },
];
