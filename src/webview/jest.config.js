/**
 * Jest Configuration for Webview Tests
 *
 * Extends the base Jest config with React-specific settings.
 */

module.exports = {
    // Use the base config as a starting point
    preset: 'ts-jest',

    // Test environment for React components
    testEnvironment: 'jsdom',

    // Setup files to run after Jest is initialized
    setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

    // Module name mapper for theme imports
    moduleNameMapper: {
        // Handle CSS imports
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        // Handle path aliases if needed
        '^@/(.*)$': '<rootDir>/src/$1',
    },

    // Transform TypeScript and JSX files
    transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
            tsconfig: '../../tsconfig.json',
        }],
    },

    // Files to include in coverage
    collectCoverageFrom: [
        '**/*.{ts,tsx}',
        '!**/*.d.ts',
        '!**/__tests__/**',
        '!**/__mocks__/**',
        '!**/index.ts',
        '!jest.config.js',
        '!jest.setup.ts',
    ],

    // Coverage thresholds - temporarily disabled for reporting
    // coverageThreshold: {
    //     global: {
    //         branches: 70,
    //         functions: 70,
    //         lines: 70,
    //         statements: 70,
    //     },
    // },

    // Test match patterns
    testMatch: [
        '**/__tests__/**/*.test.{ts,tsx}',
        '**/*.test.{ts,tsx}',
    ],

    // Ignore patterns
    testPathIgnorePatterns: [
        '/node_modules/',
        '/out/',
        '/dist/',
    ],

    // Module file extensions
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

    // Verbose output
    verbose: true,
};
