/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: ['**/?(*.)+(test).[jt]s?(x)'],

  transform: {
    '^.+\\.(ts|tsx)$': 'babel-jest',
  },









  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};


