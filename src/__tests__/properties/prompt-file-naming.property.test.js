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
 * Feature: feature-based-architecture, Property 16: Prompt File Naming
 *
 * For any file in the core/prompts directory, the filename should end with "Prompts.ts"
 *
 * Validates: Requirements 7.5
 */
describe('Property 16: Prompt File Naming', () => {
    const promptsDir = path.join(__dirname, '../../core/prompts');
    /**
     * Check if a filename ends with "Prompts.ts"
     */
    function isValidPromptFileName(fileName) {
        // Exclude index.ts as it's a barrel export
        if (fileName === 'index.ts') {
            return true;
        }
        // All other files should end with "Prompts.ts"
        return fileName.endsWith('Prompts.ts');
    }
    it('should have all prompt files ending with "Prompts.ts"', () => {
        // Check if prompts directory exists
        if (!fs.existsSync(promptsDir)) {
            throw new Error(`Prompts directory does not exist: ${promptsDir}`);
        }
        // Get all TypeScript files in the prompts directory
        const files = fs
            .readdirSync(promptsDir, { withFileTypes: true })
            .filter((dirent) => dirent.isFile() && dirent.name.endsWith('.ts'))
            .map((dirent) => dirent.name);
        // Verify we have at least some files
        expect(files.length).toBeGreaterThan(0);
        // Check each file follows the naming convention
        files.forEach((fileName) => {
            expect(isValidPromptFileName(fileName)).toBe(true);
        });
    });
    it('should reject invalid prompt file names', () => {
        const invalidNames = [
            'System.ts',
            'Persona.ts',
            'Feedback.ts',
            'Build.ts',
            'prompts.ts',
            'SystemPrompt.ts', // Missing 's' at the end
            'PersonaPrompt.ts',
            'system-prompts.ts',
            'SystemPrompts.js', // Wrong extension
        ];
        invalidNames.forEach((name) => {
            expect(isValidPromptFileName(name)).toBe(false);
        });
    });
    it('should accept valid prompt file names', () => {
        const validNames = [
            'SystemPrompts.ts',
            'PersonaPrompts.ts',
            'FeedbackPrompts.ts',
            'BuildPrompts.ts',
            'CustomPrompts.ts',
            'index.ts', // Barrel export is allowed
        ];
        validNames.forEach((name) => {
            expect(isValidPromptFileName(name)).toBe(true);
        });
    });
    it('should verify all prompt files exist', () => {
        const expectedFiles = [
            'SystemPrompts.ts',
            'PersonaPrompts.ts',
            'FeedbackPrompts.ts',
            'BuildPrompts.ts',
            'index.ts',
        ];
        expectedFiles.forEach((fileName) => {
            const filePath = path.join(promptsDir, fileName);
            expect(fs.existsSync(filePath)).toBe(true);
        });
    });
    it('should verify prompt files export functions or constants', () => {
        const promptFiles = fs
            .readdirSync(promptsDir, { withFileTypes: true })
            .filter((dirent) => dirent.isFile() && dirent.name.endsWith('Prompts.ts'))
            .map((dirent) => dirent.name);
        promptFiles.forEach((fileName) => {
            const filePath = path.join(promptsDir, fileName);
            const content = fs.readFileSync(filePath, 'utf-8');
            // Verify the file has at least one export
            const hasExport = /export\s+(function|const|interface|type|class)/.test(content);
            expect(hasExport).toBe(true);
        });
    });
});
//# sourceMappingURL=prompt-file-naming.property.test.js.map