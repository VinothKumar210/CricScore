/** @type {import('ts-jest').JestConfigWithTsJest} */
const config = {
    preset: 'ts-jest/presets/default-esm',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/__tests__/**/*.test.ts'],
    moduleFileExtensions: ['ts', 'js', 'json'],
    extensionsToTreatAsEsm: ['.ts'],
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
    transform: {
        '^.+\\.ts$': [
            'ts-jest',
            {
                useESM: true,
                tsconfig: {
                    module: 'esnext',
                    moduleResolution: 'bundler',
                    verbatimModuleSyntax: false,
                    types: ['jest', 'node'],
                    declaration: false,
                    declarationMap: false,
                    sourceMap: false,
                },
            },
        ],
    },
    collectCoverageFrom: [
        'src/services/**/*.ts',
        'src/routes/**/*.ts',
        'src/utils/**/*.ts',
        '!src/**/*.d.ts',
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'json-summary'],
    testTimeout: 10000,
    verbose: true,
};

export default config;
