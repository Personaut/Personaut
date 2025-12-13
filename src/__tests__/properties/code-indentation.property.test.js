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
 * Feature: feature-based-architecture, Property 10: Code Indentation
 *
 * For any TypeScript file, the indentation should use 2 spaces with no tabs
 *
 * Validates: Requirements 15.12
 */
describe('Property 10: Code Indentation', () => {
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
     * Check if a line contains tabs
     */
    function containsTabs(line) {
        return line.includes('\t');
    }
    /**
     * Check if indentation uses spaces that are not multiples of 2
     * This checks leading whitespace only
     * Note: Allows alignment of continuation lines (common practice)
     */
    function hasInvalidIndentation(line) {
        // Skip empty lines
        if (line.trim().length === 0) {
            return false;
        }
        // Skip JSDoc comment lines (they use single space for alignment)
        const trimmed = line.trim();
        if (trimmed.startsWith('*') || trimmed.startsWith('/**') || trimmed.startsWith('*/')) {
            return false;
        }
        // Get leading whitespace
        const leadingWhitespace = line.match(/^[ ]*/)?.[0] || '';
        const spaces = leadingWhitespace.length;
        // Check if it's a multiple of 2
        if (spaces % 2 !== 0) {
            // Allow continuation lines that are aligned (common practice)
            // These typically have more than 10 spaces and are aligning with an opening bracket/paren
            if (spaces > 10) {
                return false;
            }
            return true;
        }
        return false;
    }
    it('should not use tabs for indentation', () => {
        const allFiles = getAllTypeScriptFiles(srcDir);
        // Verify we have files to test
        expect(allFiles.length).toBeGreaterThan(0);
        const violations = [];
        allFiles.forEach((filePath) => {
            const content = fs.readFileSync(filePath, 'utf-8');
            const lines = content.split('\n');
            lines.forEach((line, index) => {
                if (containsTabs(line)) {
                    violations.push({
                        file: path.relative(srcDir, filePath),
                        line: index + 1,
                        content: line.substring(0, 50) + (line.length > 50 ? '...' : ''),
                    });
                }
            });
        });
        if (violations.length > 0) {
            console.log('Files with tab characters:');
            violations
                .slice(0, 10)
                .forEach((v) => console.log(`  - ${v.file}:${v.line} - "${v.content}"`));
            if (violations.length > 10) {
                console.log(`  ... and ${violations.length - 10} more violations`);
            }
        }
        expect(violations).toEqual([]);
    });
    it('should use 2-space indentation', () => {
        const allFiles = getAllTypeScriptFiles(srcDir);
        // Verify we have files to test
        expect(allFiles.length).toBeGreaterThan(0);
        const violations = [];
        allFiles.forEach((filePath) => {
            const content = fs.readFileSync(filePath, 'utf-8');
            const lines = content.split('\n');
            lines.forEach((line, index) => {
                if (hasInvalidIndentation(line)) {
                    const leadingSpaces = line.match(/^[ ]*/)?.[0].length || 0;
                    violations.push({
                        file: path.relative(srcDir, filePath),
                        line: index + 1,
                        spaces: leadingSpaces,
                        content: line.trim().substring(0, 50) + (line.trim().length > 50 ? '...' : ''),
                    });
                }
            });
        });
        if (violations.length > 0) {
            console.log('Lines with non-2-space indentation:');
            violations
                .slice(0, 10)
                .forEach((v) => console.log(`  - ${v.file}:${v.line} - ${v.spaces} spaces - "${v.content}"`));
            if (violations.length > 10) {
                console.log(`  ... and ${violations.length - 10} more violations`);
            }
        }
        expect(violations).toEqual([]);
    });
    it('should validate tab detection', () => {
        const linesWithTabs = ['\tconst x = 1;', '  \tconst y = 2;', 'const z = 3;\t// comment'];
        linesWithTabs.forEach((line) => {
            expect(containsTabs(line)).toBe(true);
        });
    });
    it('should not detect tabs in lines without tabs', () => {
        const linesWithoutTabs = ['  const x = 1;', '    const y = 2;', 'const z = 3; // comment'];
        linesWithoutTabs.forEach((line) => {
            expect(containsTabs(line)).toBe(false);
        });
    });
    it('should validate 2-space indentation detection', () => {
        const validLines = ['const x = 1;', '  const y = 2;', '    const z = 3;', '      const a = 4;'];
        validLines.forEach((line) => {
            expect(hasInvalidIndentation(line)).toBe(false);
        });
    });
    it('should detect invalid indentation', () => {
        const invalidLines = [' const x = 1;', '   const y = 2;', '     const z = 3;'];
        invalidLines.forEach((line) => {
            expect(hasInvalidIndentation(line)).toBe(true);
        });
    });
});
//# sourceMappingURL=code-indentation.property.test.js.map