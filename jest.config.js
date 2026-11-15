module.exports = {
  preset: 'jest-expo',
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
