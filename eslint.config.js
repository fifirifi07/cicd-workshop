import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Flat config (ESLint 9+).
 *
 * The rule set is deliberately small. Linting is the first gate in the pipeline and its job
 * is to fail in seconds on real problems - not to argue about formatting. A noisy linter
 * teaches participants to ignore the first red signal, which is the exact opposite of
 * what this workshop is about.
 */
export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'playwright-report/**', 'test-results/**', 'reports/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/web/**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ['src/server/**/*.ts', 'scripts/**/*.mjs', '*.config.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['tests/**/*.ts'],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      // Test data comes back from the API as `any`; asserting on it is the point.
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
    },
  },
  {
    // Writing to stdout is the entire point of a CLI script and of a server startup banner.
    files: ['scripts/**', 'src/server/index.ts'],
    rules: {
      'no-console': 'off',
    },
  },
);
