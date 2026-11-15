module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.js'],
  // os testes de tela carregam a tela inteira; no GitHub o primeiro pode passar de 5s
  testTimeout: 20000,
  testMatch: ['<rootDir>/__tests__/**/*.test.js'],
  // as regras do Firestore precisam do emulador e rodam com npm run test:regras
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/__tests__/regras/'],
  transform: {
    '\\.[jt]sx?$': [
      'babel-jest',
      {
        caller: { name: 'metro', bundler: 'metro', platform: 'ios' },
        configFile: require.resolve('./jest.babel.config.js'),
      },
    ],
  },
};
