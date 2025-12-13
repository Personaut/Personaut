"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Feature: feature-based-architecture, Property 6: Test File Naming
 *
 * For any test file, the filename should match the component name
 * with .test or .spec suffix
 *
 * Validates: Requirements 15.4
 */
describe('Property 6: Test File Naming', () => {
    const srcDir = path.join(__dirname, '../..');
    /**
     * Helper function to recursively get all test files
     */
    function getAllTestFiles(dirPath) {
        const files = [];
        if (!fs.existsSync(dirPath)) {
            return files;
        }
        const items = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const item of items) {
            const fullPath = path.join(dirPath, item.name);
            if (item.isDirectory()) {
                // Skip node_modules and other non-source directories
                if (!['node_modules', 'out', 'dist', '.git'].includes(item.name)) {
                    files.push(...getAllTestFiles(fullPath));
                }
            }
            else if (item.isFile() &&
                (item.name.endsWith('.test.ts') ||
                    item.name.endsWith('.test.tsx') ||
                    item.name.endsWith('.spec.ts') ||
                    item.name.endsWith('.spec.tsx'))) {
                files.push(fullPath);
            }
        }
        return files;
    }
    /**
     * Check if a test file has the correct suffix
     */
    function hasCorrectTestSuffix(fileName) {
        return (fileName.endsWith('.test.ts') ||
            fileName.endsWith('.test.tsx') ||
            fileName.endsWith('.spec.ts') ||
            fileName.endsWith('.spec.tsx'));
    }
    /**
     * Check if the test file name matches a corresponding source file
     */
    function hasMatchingSourceFile(testFilePath) {
        const dir = path.dirname(testFilePath);
        const fileName = path.basename(testFilePath);
        // Extract the base name without test suffix
        let baseName = fileName;
        if (fileName.endsWith('.test.ts')) {
            baseName = fileName.replace('.test.ts', '.ts');
        }
        else if (fileName.endsWith('.test.tsx')) {
            baseName = fileName.replace('.test.tsx', '.tsx');
        }
        else if (fileName.endsWith('.spec.ts')) {
            baseName = fileName.replace('.spec.ts', '.ts');
        }
        else if (fileName.endsWith('.spec.tsx')) {
            baseName = fileName.replace('.spec.tsx', '.tsx');
        }
        // Check if corresponding source file exists
        const sourceFilePath = path.join(dir, baseName);
        return fs.existsSync(sourceFilePath);
    }
    /**
     * Get the base name of a test file (without test suffix and extension)
     */
    function getTestBaseName(fileName) {
        // Handle property tests first (longer pattern)
        if (fileName.endsWith('.property.test.ts')) {
            return fileName.replace('.property.test.ts', '');
        }
        if (fileName.endsWith('.property.test.tsx')) {
            return fileName.replace('.property.test.tsx', '');
        }
        // Then handle regular tests
        if (fileName.endsWith('.test.ts')) {
            return fileName.replace('.test.ts', '');
        }
        if (fileName.endsWith('.test.tsx')) {
            return fileName.replace('.test.tsx', '');
        }
        if (fileName.endsWith('.spec.ts')) {
            return fileName.replace('.spec.ts', '');
        }
        if (fileName.endsWith('.spec.tsx')) {
            return fileName.replace('.spec.tsx', '');
        }
        return fileName;
    }
    it('should have correct test suffix (.test or .spec)', () => {
        const allTestFiles = getAllTestFiles(srcDir);
        // Verify we have test files
        expect(allTestFiles.length).toBeGreaterThan(0);
        allTestFiles.forEach((testFile) => {
            const fileName = path.basename(testFile);
            expect(hasCorrectTestSuffix(fileName)).toBe(true);
        });
    });
    it('should have matching source files for unit tests', () => {
        const allTestFiles = getAllTestFiles(srcDir);
        const violations = [];
        allTestFiles.forEach((testFile) => {
            const fileName = path.basename(testFile);
            // Skip property tests as they don't have matching source files
            if (fileName.includes('.property.test.')) {
                return;
            }
            if (!hasMatchingSourceFile(testFile)) {
                violations.push(testFile);
            }
        });
        if (violations.length > 0) {
            console.log('Test files without matching source files:');
            violations.forEach((v) => console.log(`  - ${v}`));
        }
        expect(violations).toEqual([]);
    });
    it('should validate test file naming patterns', () => {
        const validTestNames = [
            'Agent.test.ts',
            'ChatHandler.test.tsx',
            'stringUtils.spec.ts',
            'SidebarProvider.test.ts',
            'directory-naming.property.test.ts',
        ];
        validTestNames.forEach((name) => {
            expect(hasCorrectTestSuffix(name)).toBe(true);
        });
    });
    it('should reject invalid test file names', () => {
        const invalidTestNames = [
            'Agent.tests.ts',
            'ChatHandler.testing.tsx',
            'stringUtils.ts',
            'SidebarProvider.tsx',
            'test-Agent.ts',
        ];
        invalidTestNames.forEach((name) => {
            expect(hasCorrectTestSuffix(name)).toBe(false);
        });
    });
    it('should extract correct base names from test files', () => {
        const testCases = [
            { input: 'Agent.test.ts', expected: 'Agent' },
            { input: 'ChatHandler.test.tsx', expected: 'ChatHandler' },
            { input: 'stringUtils.spec.ts', expected: 'stringUtils' },
            { input: 'directory-naming.property.test.ts', expected: 'directory-naming' },
        ];
        testCases.forEach(({ input, expected }) => {
            expect(getTestBaseName(input)).toBe(expected);
        });
    });
});
//# sourceMappingURL=test-file-naming.property.test.js.map