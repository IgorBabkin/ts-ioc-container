/* eslint-disable */
module.exports = {
    testMatch: ['**/__tests__/**/*.+(ts)', '**/?(*.)+(spec|test).+(ts)'],
    transform: {
        '^.+\\.tsx?$': 'ts-jest',
    },
    modulePathIgnorePatterns: ['<rootDir>/node_modules/'],
    collectCoverage: true,
};
