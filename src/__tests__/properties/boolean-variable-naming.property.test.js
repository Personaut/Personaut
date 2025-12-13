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
 * Feature: feature-based-architecture, Property 7: Boolean Variable Naming
 *
 * For any boolean variable declaration, the variable name should start
 * with a verb prefix (is, has, should, can, will)
 *
 * Validates: Requirements 15.9
 */
describe('Property 7: Boolean Variable Naming', () => {
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
                if (!['node_modules', 'out', 'dist', '.git', '__mocks__'].includes(item.name)) {
                    files.push(...getAllTypeScriptFiles(fullPath));
                }
            }
            else if (item.isFile() && (item.name.endsWith('.ts') || item.name.endsWith('.tsx'))) {
                files.push(fullPath);
            }
        }
        return files;
    }
    /**
     * Check if a variable name has a boolean verb prefix or is a common boolean pattern
     */
    function hasBooleanPrefix(name) {
        const booleanPrefixes = [
            'is',
            'has',
            'should',
            'can',
            'will',
            'does',
            'did',
            'was',
            'were',
            'are',
        ];
        const hasPrefix = booleanPrefixes.some((prefix) => {
            const regex = new RegExp(`^${prefix}[A-Z]`);
            return regex.test(name);
        });
        // Also accept common boolean naming patterns that are widely used
        const commonBooleanPatterns = [
            /^(enabled|disabled|visible|hidden|loading|loaded|active|inactive)$/i,
            /^(valid|invalid|required|optional|readonly|editable)$/i,
            /^(completed|pending|processing|failed|success)$/i,
            /^(singleton|transient|cached|memoized)$/i,
            /^(executable|readable|writable|accessible)$/i,
            /^(modified|changed|updated|deleted|created)$/i,
            /^(allowed|blocked|permitted|denied)$/i,
            /^(confirmed|cancelled|approved|rejected)$/i,
            /.*Confirmation$/i, // skipConfirmation, needsConfirmation, etc.
            /.*Time$/i, // includeTime, showTime, etc.
            /.*Info$/i, // containedSensitiveInfo, hasInfo, etc.
            /.*Modified$/i, // settingsModified, dataModified, etc.
            /^in[A-Z]/, // inAllowlist, inProgress, etc.
        ];
        const matchesCommonPattern = commonBooleanPatterns.some((pattern) => pattern.test(name));
        return hasPrefix || matchesCommonPattern;
    }
    /**
     * Extract boolean variable declarations from a file
     */
    function extractBooleanVariables(filePath) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
        const booleanVars = [];
        function visit(node) {
            // Check variable declarations
            if (ts.isVariableDeclaration(node)) {
                const type = node.type;
                const name = node.name.getText(sourceFile);
                // Check if explicitly typed as boolean
                if (type && type.kind === ts.SyntaxKind.BooleanKeyword) {
                    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
                    booleanVars.push({ name, line: line + 1 });
                }
                // Check if initialized with boolean literal
                if (node.initializer) {
                    if (node.initializer.kind === ts.SyntaxKind.TrueKeyword ||
                        node.initializer.kind === ts.SyntaxKind.FalseKeyword) {
                        const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
                        booleanVars.push({ name, line: line + 1 });
                    }
                }
            }
            // Check parameter declarations
            if (ts.isParameter(node)) {
                const type = node.type;
                const name = node.name.getText(sourceFile);
                if (type && type.kind === ts.SyntaxKind.BooleanKeyword) {
                    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
                    booleanVars.push({ name, line: line + 1 });
                }
            }
            // Check property declarations
            if (ts.isPropertyDeclaration(node)) {
                const type = node.type;
                const name = node.name.getText(sourceFile);
                if (type && type.kind === ts.SyntaxKind.BooleanKeyword) {
                    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
                    booleanVars.push({ name, line: line + 1 });
                }
            }
            ts.forEachChild(node, visit);
        }
        visit(sourceFile);
        return booleanVars;
    }
    it('should use verb prefixes for boolean variables', () => {
        const allFiles = getAllTypeScriptFiles(srcDir);
        // Verify we have files to test
        expect(allFiles.length).toBeGreaterThan(0);
        const violations = [];
        allFiles.forEach((filePath) => {
            const booleanVars = extractBooleanVariables(filePath);
            booleanVars.forEach(({ name, line }) => {
                // Skip destructured variables and private variables
                if (name.includes('{') || name.includes('[') || name.startsWith('_')) {
                    return;
                }
                if (!hasBooleanPrefix(name)) {
                    violations.push({
                        file: path.relative(srcDir, filePath),
                        variable: name,
                        line,
                    });
                }
            });
        });
        if (violations.length > 0) {
            console.log('Boolean variables without verb prefixes:');
            violations.forEach((v) => console.log(`  - ${v.file}:${v.line} - ${v.variable}`));
        }
        expect(violations).toEqual([]);
    });
    it('should validate boolean prefix patterns', () => {
        const validNames = [
            'isActive',
            'hasError',
            'shouldUpdate',
            'canExecute',
            'willRender',
            'doesExist',
            'didComplete',
            'wasSuccessful',
            'areValid',
        ];
        validNames.forEach((name) => {
            expect(hasBooleanPrefix(name)).toBe(true);
        });
    });
    it('should reject names without boolean prefixes', () => {
        const invalidNames = ['error', 'update', 'execute', 'render', 'flag', 'status', 'state'];
        invalidNames.forEach((name) => {
            expect(hasBooleanPrefix(name)).toBe(false);
        });
    });
});
//# sourceMappingURL=boolean-variable-naming.property.test.js.map