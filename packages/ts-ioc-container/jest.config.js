/* eslint-disable no-undef */
module.exports = {
    testMatch: ['**/?(*.)+(spec|test).+(ts)'],
    transform: {
        '^.+\\.tsx?$': [
            'ts-jest',
            {
                tsConfig: './tsconfig.json',
                isolatedModules: false,
            },
        ],
    },
    collectCoverage: true,
    coveragePathIgnorePatterns: ['/node_modules/', '/fixtures/', '/cjm/', '/esm/'],
    moduleDirectories: ['node_modules'],
};
