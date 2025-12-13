"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const BrowserTool_1 = require("./BrowserTool");
const URLValidator_1 = require("../../shared/services/URLValidator");
// Mock puppeteer
jest.mock('puppeteer', () => ({
    launch: jest.fn(),
}));
describe('BrowserTool', () => {
    let browserTool;
    let urlValidator;
    beforeEach(() => {
        browserTool = new BrowserTool_1.BrowserTool();
        urlValidator = new URLValidator_1.URLValidator();
        browserTool.setContext({ urlValidator });
    });
    afterEach(async () => {
        await browserTool.dispose();
    });
    describe('URL validation', () => {
        it('should reject empty URL', async () => {
            const result = await browserTool.execute({ action: 'launch', url: '' });
            expect(result).toContain('Error: URL is required');
        });
        it('should reject invalid URL format', async () => {
            const result = await browserTool.execute({ action: 'launch', url: 'not-a-url' });
            expect(result).toContain('Error: URL blocked');
        });
        it('should reject internal network addresses by default', async () => {
            const result = await browserTool.execute({ action: 'launch', url: 'http://localhost:3000' });
            expect(result).toContain('Error: URL blocked');
        });
    });
    describe('Action handling', () => {
        it('should reject missing action', async () => {
            const result = await browserTool.execute({});
            expect(result).toContain("Error: Missing 'action' attribute");
        });
        it('should reject unknown action', async () => {
            const result = await browserTool.execute({ action: 'unknown' });
            expect(result).toContain("Error: Unknown action 'unknown'");
        });
        it('should handle close action', async () => {
            const result = await browserTool.execute({ action: 'close' });
            expect(result).toBe('Browser closed.');
        });
    });
    describe('Browser state', () => {
        it('should report browser as closed initially', () => {
            expect(browserTool.isOpen()).toBe(false);
        });
    });
});
//# sourceMappingURL=BrowserTool.test.js.map