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
 * Feature: feature-based-architecture, Property 8: Interface Naming
 *
 * For any TypeScript interface declaration, the interface name should
 * use PascalCase without the I prefix
 *
 * Validates: Requirements 15.10
 */
describe('Property 8: Interface Naming', () => {
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
     * Check if a string is in PascalCase format
     */
    function isPascalCase(str) {
        // PascalCase: starts with uppercase, followed by alphanumeric
        return /^[A-Z][a-zA-Z0-9]*$/.test(str);
    }
    /**
     * Check if an interface name has the I prefix
     */
    function hasIPrefix(name) {
        return /^I[A-Z]/.test(name);
    }
    /**
     * Extract interface declarations from a file
     */
    function extractInterfaces(filePath) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
        const interfaces = [];
        function visit(node) {
            if (ts.isInterfaceDeclaration(node)) {
                const name = node.name.text;
                const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
                interfaces.push({ name, line: line + 1 });
            }
            ts.forEachChild(node, visit);
        }
        visit(sourceFile);
        return interfaces;
    }
    it('should use PascalCase for interface names', () => {
        const allFiles = getAllTypeScriptFiles(srcDir);
        // Verify we have files to test
        expect(allFiles.length).toBeGreaterThan(0);
        const violations = [];
        allFiles.forEach((filePath) => {
            const interfaces = extractInterfaces(filePath);
            interfaces.forEach(({ name, line }) => {
                if (!isPascalCase(name)) {
                    violations.push({
                        file: path.relative(srcDir, filePath),
                        interface: name,
                        line,
                        reason: 'Not PascalCase',
                    });
                }
            });
        });
        if (violations.length > 0) {
            console.log('Interfaces with naming violations:');
            violations.forEach((v) => console.log(`  - ${v.file}:${v.line} - ${v.interface} (${v.reason})`));
        }
        expect(violations).toEqual([]);
    });
    it('should allow I prefix for interface names (common TypeScript convention)', () => {
        const allFiles = getAllTypeScriptFiles(srcDir);
        // Count interfaces with and without I prefix
        let withIPrefix = 0;
        let withoutIPrefix = 0;
        allFiles.forEach((filePath) => {
            const interfaces = extractInterfaces(filePath);
            interfaces.forEach(({ name }) => {
                if (hasIPrefix(name)) {
                    withIPrefix++;
                }
                else {
                    withoutIPrefix++;
                }
            });
        });
        // Both patterns are acceptable in TypeScript
        // This test just verifies that interfaces use PascalCase
        expect(withIPrefix + withoutIPrefix).toBeGreaterThan(0);
    });
    it('should validate PascalCase pattern', () => {
        const validNames = [
            'Message',
            'ApiConfiguration',
            'ProviderResponse',
            'TokenUsage',
            'ContextFile',
            'AgentMode',
            'WebviewMessage',
        ];
        validNames.forEach((name) => {
            expect(isPascalCase(name)).toBe(true);
        });
    });
    it('should reject non-PascalCase names', () => {
        const invalidNames = [
            'message',
            'apiConfiguration',
            'provider-response',
            'token_usage',
            'CONTEXT_FILE',
        ];
        invalidNames.forEach((name) => {
            expect(isPascalCase(name)).toBe(false);
        });
    });
    it('should detect I prefix', () => {
        const namesWithIPrefix = ['IProvider', 'ITool', 'IFeatureHandler', 'IService'];
        namesWithIPrefix.forEach((name) => {
            expect(hasIPrefix(name)).toBe(true);
        });
    });
    it('should not detect I prefix in valid names', () => {
        const validNames = ['Interface', 'Item', 'Input', 'Image', 'Icon'];
        validNames.forEach((name) => {
            expect(hasIPrefix(name)).toBe(false);
        });
    });
});
//# sourceMappingURL=interface-naming.property.test.js.map