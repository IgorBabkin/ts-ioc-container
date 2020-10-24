/* eslint-disable */
module.exports = {
    testMatch: ['**/?(*.)+(spec|test).+(ts)'],
    transform: {
        '^.+\\.tsx?$': 'ts-jest',
    },
    collectCoverage: true,
    coveragePathIgnorePatterns: ['/node_modules/', '/fixtures/', '/cjm/', '/esm/'],
};
