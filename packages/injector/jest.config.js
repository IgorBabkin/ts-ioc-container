/* eslint-disable no-undef */
module.exports = {
    testMatch: ['**/?(*.)+(spec|test).+(ts)'],
    transform: {
        '^.+\\.tsx?$': 'ts-jest',
    },
    coveragePathIgnorePatterns: ['/node_modules/', '/fixtures/', '/cjm/', '/esm/'],
    moduleDirectories: ['node_modules'],
};
