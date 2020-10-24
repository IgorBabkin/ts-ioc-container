/* eslint-disable */
module.exports = {
    testMatch: ['**/?(*.)+(spec|test).+(ts)'],
    transform: {
        '^.+\\.tsx?$': 'ts-jest',
    },
    modulePathIgnorePatterns: ['<rootDir>/node_modules/'],
    collectCoverage: true,
    coveragePathIgnorePatterns: ['/node_modules/', '/fixtures/'],
};
