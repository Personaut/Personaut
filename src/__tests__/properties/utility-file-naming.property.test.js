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
const ts = __importStar(require("typescript"));
/**
 * Feature: feature-based-architecture, Property 5: Utility File Naming
 *
 * For any TypeScript file exporting utility functions,
 * the filename should use camelCase
 *
 * Validates: Requirements 15.3
 */
describe('Property 5: Utility File Naming', () => {
    const srcDir = path.join(__dirname, '../..');
    /**
     * Helper function to recursively get all TypeScript files
     */
    function getAllTypeScriptFiles(dirPath) {
        const files = [];
        if (!fs.existsSync(dirPath)) {
            return files;
        }
        const items = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const item of items) {
            const fullPath = path.join(dirPath, item.name);
            if (item.isDirectory()) {
                // Skip node_modules, test directories, mocks, and other non-source directories
                if (!['node_modules', 'out', 'dist', '.git', '__mocks__', '__tests__'].includes(item.name)) {
                    files.push(...getAllTypeScriptFiles(fullPath));
                }
            }
            else if (item.isFile() && (item.name.endsWith('.ts') || item.name.endsWith('.tsx'))) {
                // Skip test files, mock files, and index files
                if (!item.name.endsWith('.test.ts') &&
                    !item.name.endsWith('.test.tsx') &&
                    !item.name.endsWith('.spec.ts') &&
                    !item.name.endsWith('.spec.tsx') &&
                    item.name !== 'index.ts' &&
                    item.name !== 'index.tsx' &&
                    !fullPath.includes('__mocks__')) {
                    files.push(fullPath);
                }
            }
        }
        return files;
    }
    /**
     * Check if a string is in camelCase format
     */
    function isCamelCase(str) {
        // camelCase: starts with lowercase, followed by alphanumeric
        return /^[a-z][a-zA-Z0-9]*$/.test(str);
    }
    /**
     * Check if a file exports utility functions (functions but not classes)
     */
    function exportsUtilityFunctions(filePath) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
        let hasFunctionExport = false;
        let hasClassExport = false;
        function visit(node) {
            // Check for exported functions
            if (ts.isFunctionDeclaration(node)) {
                const hasExportModifier = node.modifiers?.some((mod) => mod.kind === ts.SyntaxKind.ExportKeyword);
                if (hasExportModifier) {
                    hasFunctionExport = true;
                }
            }
            // Check for exported classes
            if (ts.isClassDeclaration(node)) {
                const hasExportModifier = node.modifiers?.some((mod) => mod.kind === ts.SyntaxKind.ExportKeyword);
                if (hasExportModifier) {
                    hasClassExport = true;
                }
            }
            // Check for variable declarations that might be arrow functions
            if (ts.isVariableStatement(node)) {
                const hasExportModifier = node.modifiers?.some((mod) => mod.kind === ts.SyntaxKind.ExportKeyword);
                if (hasExportModifier) {
                    node.declarationList.declarations.forEach((decl) => {
                        if (decl.initializer &&
                            (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer))) {
                            hasFunctionExport = true;
                        }
                    });
                }
            }
            ts.forEachChild(node, visit);
        }
        visit(sourceFile);
        // Only consider it a utility file if it exports functions but not classes
        return hasFunctionExport && !hasClassExport;
    }
    it('should use camelCase for files exporting utility functions', () => {
        const allFiles = getAllTypeScriptFiles(srcDir);
        // Verify we have files to test
        expect(allFiles.length).toBeGreaterThan(0);
        const violations = [];
        allFiles.forEach((filePath) => {
            // Only check files in utils directories or files that export utility functions
            const isInUtilsDir = filePath.includes('/utils/');
            if (isInUtilsDir && exportsUtilityFunctions(filePath)) {
                const fileName = path.basename(filePath, path.extname(filePath));
                if (!isCamelCase(fileName)) {
                    violations.push(filePath);
                }
            }
        });
        if (violations.length > 0) {
            console.log('Files with naming violations:');
            violations.forEach((v) => console.log(`  - ${v}`));
        }
        expect(violations).toEqual([]);
    });
    it('should validate camelCase pattern', () => {
        const validNames = [
            'stringUtils',
            'arrayUtils',
            'objectUtils',
            'timeUtils',
            'formatters',
            'helpers',
            'validators',
        ];
        validNames.forEach((name) => {
            expect(isCamelCase(name)).toBe(true);
        });
    });
    it('should reject non-camelCase names', () => {
        const invalidNames = [
            'StringUtils',
            'ArrayUtils',
            'string-utils',
            'string_utils',
            'STRING_UTILS',
            'Formatters',
            'HELPERS',
        ];
        invalidNames.forEach((name) => {
            expect(isCamelCase(name)).toBe(false);
        });
    });
});
//# sourceMappingURL=utility-file-naming.property.test.js.map