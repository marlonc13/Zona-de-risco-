// Testes das regras do Firestore: rodam em Node contra o emulador do Firebase
// (npm run test:regras), separados dos testes do app.
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/__tests__/regras/**/*.test.js'],
  transform: {},
  testTimeout: 20000,
};
