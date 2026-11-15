// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const globals = require('globals');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // variáveis globais do Jest (describe, it, expect, jest...) nos testes
    files: ['__tests__/**/*.js'],
    languageOptions: { globals: globals.jest },
  },
]);
