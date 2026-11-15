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
  {
    // testes das regras do Firestore rodam em Node, fora do app
    files: ['__tests__/regras/**/*.js'],
    languageOptions: { globals: { ...globals.jest, ...globals.node } },
  },
]);
