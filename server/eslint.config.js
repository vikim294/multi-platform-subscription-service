import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    ignores: ['node_modules'],
  },
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        clearInterval: 'readonly',
        setInterval: 'readonly',
        setTimeout: 'readonly',
      },
    },
  },
];
