import type { JestConfigWithTsJest } from 'ts-jest';

const config: JestConfigWithTsJest = {
  testEnvironment: 'node',

  rootDir: 'src',
  testPathIgnorePatterns: ['<rootDir>.*/files/'],
  moduleNameMapper: {
    '^ora$': '<rootDir>/test/ora.mock.ts',
  },
  transform: {
    '^.+.ts$': ['ts-jest', {}],
  },
};

export default config;
