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
 * Feature: feature-based-architecture, Property 13: Trailing Commas
 *
 * For any multiline array or object literal, the last element should have a trailing comma
 *
 * Validates: Requirements 15.17
 */
describe('Property 13: Trailing Commas', () => {
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
     * Check if a multiline array or object literal has a trailing comma
     */
    function checkTrailingCommas(filePath) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
        const violations = [];
        function visit(node) {
            // Check array literals
            if (ts.isArrayLiteralExpression(node)) {
                checkMultilineStructure(node, 'array', node.elements);
            }
            // Check object literals
            if (ts.isObjectLiteralExpression(node)) {
                checkMultilineStructure(node, 'object', node.properties);
            }
            ts.forEachChild(node, visit);
        }
        function checkMultilineStructure(node, type, elements) {
            if (elements.length === 0) {
                return;
            }
            // Get the text of the node
            const nodeText = node.getText(sourceFile);
            const lines = nodeText.split('\n');
            // Only check multiline structures
            if (lines.length <= 1) {
                return;
            }
            // Get the last element
            const lastElement = elements[elements.length - 1];
            const lastElementEnd = lastElement.getEnd();
            // Check if there's a comma after the last element
            const textAfterLastElement = content.substring(lastElementEnd, lastElementEnd + 10);
            const hasTrailingComma = textAfterLastElement.trimStart().startsWith(',');
            if (!hasTrailingComma) {
                const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
                const preview = nodeText.split('\n').slice(0, 2).join('\n').substring(0, 60);
                violations.push({
                    line: line + 1,
                    type,
                    preview: preview + (nodeText.length > 60 ? '...' : ''),
                });
            }
        }
        visit(sourceFile);
        return violations;
    }
    it('should have trailing commas in multiline arrays and objects', () => {
        const allFiles = getAllTypeScriptFiles(srcDir);
        // Verify we have files to test
        expect(allFiles.length).toBeGreaterThan(0);
        const allViolations = [];
        allFiles.forEach((filePath) => {
            const violations = checkTrailingCommas(filePath);
            violations.forEach(({ line, type, preview }) => {
                allViolations.push({
                    file: path.relative(srcDir, filePath),
                    line,
                    type,
                    preview,
                });
            });
        });
        if (allViolations.length > 0) {
            console.log('Multiline structures missing trailing commas:');
            allViolations
                .slice(0, 10)
                .forEach((v) => console.log(`  - ${v.file}:${v.line} (${v.type}) - "${v.preview}"`));
            if (allViolations.length > 10) {
                console.log(`  ... and ${allViolations.length - 10} more violations`);
            }
        }
        expect(allViolations).toEqual([]);
    });
    it('should validate trailing comma detection in arrays', () => {
        const testCases = [
            {
                code: `const arr = [
  1,
  2,
  3,
];`,
                shouldPass: true,
            },
            {
                code: `const arr = [
  1,
  2,
  3
];`,
                shouldPass: false,
            },
            {
                code: 'const arr = [1, 2, 3];',
                shouldPass: true, // Single line, no trailing comma needed
            },
        ];
        testCases.forEach(({ code, shouldPass }, index) => {
            const tempFile = path.join(__dirname, `temp-test-${index}.ts`);
            fs.writeFileSync(tempFile, code);
            const violations = checkTrailingCommas(tempFile);
            if (shouldPass) {
                expect(violations.length).toBe(0);
            }
            else {
                expect(violations.length).toBeGreaterThan(0);
            }
            // Clean up
            fs.unlinkSync(tempFile);
        });
    });
    it('should validate trailing comma detection in objects', () => {
        const testCases = [
            {
                code: `const obj = {
  a: 1,
  b: 2,
  c: 3,
};`,
                shouldPass: true,
            },
            {
                code: `const obj = {
  a: 1,
  b: 2,
  c: 3
};`,
                shouldPass: false,
            },
            {
                code: 'const obj = { a: 1, b: 2, c: 3 };',
                shouldPass: true, // Single line, no trailing comma needed
            },
        ];
        testCases.forEach(({ code, shouldPass }, index) => {
            const tempFile = path.join(__dirname, `temp-test-obj-${index}.ts`);
            fs.writeFileSync(tempFile, code);
            const violations = checkTrailingCommas(tempFile);
            if (shouldPass) {
                expect(violations.length).toBe(0);
            }
            else {
                expect(violations.length).toBeGreaterThan(0);
            }
            // Clean up
            fs.unlinkSync(tempFile);
        });
    });
});
//# sourceMappingURL=trailing-commas.property.test.js.map