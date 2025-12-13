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
 * Feature: feature-based-architecture, Property 9: Constant Naming
 *
 * For any global constant declaration, the constant name should
 * use SCREAMING_SNAKE_CASE
 *
 * Validates: Requirements 15.8
 */
describe('Property 9: Constant Naming', () => {
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
     * Check if a string is in SCREAMING_SNAKE_CASE format
     */
    function isScreamingSnakeCase(str) {
        // SCREAMING_SNAKE_CASE: uppercase letters, numbers, and underscores
        return /^[A-Z][A-Z0-9_]*$/.test(str);
    }
    /**
     * Extract global constant declarations from a file
     */
    function extractGlobalConstants(filePath) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
        const constants = [];
        function visit(node) {
            // Check for exported const declarations at module level
            if (ts.isVariableStatement(node)) {
                const hasExportModifier = node.modifiers?.some((mod) => mod.kind === ts.SyntaxKind.ExportKeyword);
                // Check if it's a const declaration
                const isConst = node.declarationList.flags & ts.NodeFlags.Const;
                if (hasExportModifier && isConst) {
                    node.declarationList.declarations.forEach((decl) => {
                        if (ts.isIdentifier(decl.name)) {
                            const name = decl.name.text;
                            const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
                            // Skip if it's a function or class (these should use camelCase/PascalCase)
                            if (decl.initializer) {
                                const isFunction = ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer);
                                const isClass = ts.isClassExpression(decl.initializer);
                                const isObject = ts.isObjectLiteralExpression(decl.initializer);
                                // Only check primitive constants and arrays,
                                // not functions, classes, or complex objects
                                if (!isFunction && !isClass && !isObject) {
                                    constants.push({ name, line: line + 1 });
                                }
                            }
                        }
                    });
                }
            }
            ts.forEachChild(node, visit);
        }
        visit(sourceFile);
        return constants;
    }
    it('should use SCREAMING_SNAKE_CASE for global constants', () => {
        const allFiles = getAllTypeScriptFiles(srcDir);
        // Verify we have files to test
        expect(allFiles.length).toBeGreaterThan(0);
        const violations = [];
        allFiles.forEach((filePath) => {
            const constants = extractGlobalConstants(filePath);
            constants.forEach(({ name, line }) => {
                if (!isScreamingSnakeCase(name)) {
                    violations.push({
                        file: path.relative(srcDir, filePath),
                        constant: name,
                        line,
                    });
                }
            });
        });
        if (violations.length > 0) {
            console.log('Constants not using SCREAMING_SNAKE_CASE:');
            violations.forEach((v) => console.log(`  - ${v.file}:${v.line} - ${v.constant}`));
        }
        expect(violations).toEqual([]);
    });
    it('should validate SCREAMING_SNAKE_CASE pattern', () => {
        const validNames = [
            'MAX_CONNECTIONS',
            'API_TIMEOUT',
            'DEFAULT_PORT',
            'ERROR_MESSAGE',
            'TOKEN_LIMIT',
            'MAX_FILE_SIZE',
            'RATE_LIMIT_WINDOW_MS',
        ];
        validNames.forEach((name) => {
            expect(isScreamingSnakeCase(name)).toBe(true);
        });
    });
    it('should reject non-SCREAMING_SNAKE_CASE names', () => {
        const invalidNames = [
            'maxConnections',
            'MaxConnections',
            'max-connections',
            'max_connections',
            'MAX-CONNECTIONS',
        ];
        invalidNames.forEach((name) => {
            expect(isScreamingSnakeCase(name)).toBe(false);
        });
    });
});
//# sourceMappingURL=constant-naming.property.test.js.map