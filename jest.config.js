'use strict';

module.exports = {
  roots: [
    'test'
  ],
  verbose: false,
  testEnvironment: 'node',
  testRegex: 'test/(.*/)*.*test.js$',
  coverageDirectory: './coverage/',
  collectCoverage: true,
  collectCoverageFrom: [
    'lib/**/*'
  ],
  transformIgnorePatterns: ['/node_modules/']
};
