// @ts-check

import eslintConfigReiryoku from '@reiryoku/eslint-config-reiryoku';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['build/**', 'node_modules/**', '.eslintrc.js', 'eslint.config.js'],
  },
  {
    files: ['**/*.ts'],
    ...eslintConfigReiryoku,
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    rules: {
      // Add any project-specific rules here if needed
    },
  },
  {
    files: ['**/*.js'],
    ...eslintConfigReiryoku,
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    rules: {
      // Add any project-specific rules here if needed
    },
  }
);