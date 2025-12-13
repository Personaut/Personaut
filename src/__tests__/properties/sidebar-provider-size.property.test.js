"use strict";
/**
 * Property test for SidebarProvider size limit
 *
 * Feature: feature-based-architecture, Property 14: SidebarProvider Size Limit
 *
 * For the SidebarProvider class, the file should contain fewer than 500 lines of code
 *
 * Validates: Requirements 9.5
 */
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
describe('Property 14: SidebarProvider Size Limit', () => {
    /**
     * Test that SidebarProvider file is under 500 lines
     * Validates: Requirements 9.5
     */
    it('should have fewer than 500 lines of code', () => {
        const sidebarProviderPath = path.join(__dirname, '../../presentation/SidebarProvider.ts');
        // Read the file
        const content = fs.readFileSync(sidebarProviderPath, 'utf-8');
        // Count lines
        const lines = content.split('\n');
        const lineCount = lines.length;
        // Count non-empty, non-comment lines for a more accurate measure
        const codeLines = lines.filter((line) => {
            const trimmed = line.trim();
            // Exclude empty lines and comment-only lines
            return (trimmed.length > 0 &&
                !trimmed.startsWith('//') &&
                !trimmed.startsWith('/*') &&
                !trimmed.startsWith('*'));
        });
        const codeLineCount = codeLines.length;
        console.log(`SidebarProvider.ts statistics:`);
        console.log(`  Total lines: ${lineCount}`);
        console.log(`  Code lines (excluding comments/empty): ${codeLineCount}`);
        console.log(`  Limit: 500 lines`);
        // Assert that total line count is under 500
        expect(lineCount).toBeLessThan(500);
        // Also check that code lines are reasonable
        expect(codeLineCount).toBeLessThan(400);
    });
    /**
     * Test that SidebarProvider maintains its thin routing layer responsibility
     * Validates: Requirements 9.5
     */
    it('should not contain business logic', () => {
        const sidebarProviderPath = path.join(__dirname, '../../presentation/SidebarProvider.ts');
        const content = fs.readFileSync(sidebarProviderPath, 'utf-8');
        // Check that it doesn't contain complex business logic patterns
        // These patterns suggest business logic that should be in handlers
        const businessLogicPatterns = [
            /await\s+this\._chatAgent/, // Direct agent usage
            /await\s+this\._buildAgent/, // Direct agent usage
            /new\s+Agent\(/, // Agent instantiation
            /\.savePersona\(/, // Direct service calls
            /\.generateFeedback\(/, // Direct service calls
            /\.saveStageFile\(/, // Direct service calls
        ];
        for (const pattern of businessLogicPatterns) {
            expect(content).not.toMatch(pattern);
        }
    });
    /**
     * Test that SidebarProvider only has routing responsibilities
     * Validates: Requirements 9.1, 9.2
     */
    it('should only contain routing and lifecycle methods', () => {
        const sidebarProviderPath = path.join(__dirname, '../../presentation/SidebarProvider.ts');
        const content = fs.readFileSync(sidebarProviderPath, 'utf-8');
        // Check for expected methods
        expect(content).toContain('resolveWebviewView');
        expect(content).toContain('handleMessage');
        expect(content).toContain('getHandlerForMessage');
        expect(content).toContain('getHtmlForWebview');
        // Check that handlers are injected via constructor
        expect(content).toContain('private readonly chatHandler');
        expect(content).toContain('private readonly personasHandler');
        expect(content).toContain('private readonly feedbackHandler');
        expect(content).toContain('private readonly buildModeHandler');
        expect(content).toContain('private readonly settingsHandler');
    });
});
//# sourceMappingURL=sidebar-provider-size.property.test.js.map