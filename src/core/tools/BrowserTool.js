"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrowserTool = void 0;
const URLValidator_1 = require("../../shared/services/URLValidator");
// Dynamic import to avoid blocking extension activation
let puppeteer = null;
/**
 * BrowserTool - Secure browser automation tool.
 *
 * Implements security controls:
 * - URL validation against allowlist/blocklist
 * - Internal network address blocking
 * - Sandbox flag validation
 * - Timeout enforcement
 * - Proper cleanup on errors
 * - User confirmation for external URLs
 *
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 */
class BrowserTool {
    constructor() {
        this.name = 'browser_action';
        this.description = 'Interact with a web browser. Supports launching, navigating, clicking, typing, and reading content.';
        this.browser = null;
        this.page = null;
        this.urlValidator = new URLValidator_1.URLValidator();
    }
    /**
     * Set the secure execution context.
     */
    setContext(context) {
        this.urlValidator = context.urlValidator;
        this.requestConfirmation = context.requestConfirmation;
    }
    getUsageExample() {
        return `
<browser_action action="launch" url="https://google.com" />
<browser_action action="click" selector="#search-button" />
<browser_action action="type" selector="#search-input" text="query" />
<browser_action action="read" />
<browser_action action="close" />
`;
    }
    async execute(args) {
        const action = args.action;
        if (!action) {
            return "Error: Missing 'action' attribute.";
        }
        try {
            switch (action) {
                case 'launch':
                case 'navigate':
                    return await this.launchOrNavigate(args.url);
                case 'click':
                    return await this.click(args.selector);
                case 'type':
                    return await this.type(args.selector, args.text);
                case 'read':
                    return await this.read();
                case 'close':
                    return await this.close();
                default:
                    return `Error: Unknown action '${action}'.`;
            }
        }
        catch (e) {
            // Ensure cleanup on error (Property 17: Browser Cleanup on Error)
            await this.cleanupOnError();
            return `Browser Error: ${e.message}`;
        }
    }
    async launchOrNavigate(url) {
        if (!url) {
            return 'Error: URL is required for launch/navigate.';
        }
        // Validate URL (Property 15: URL Validation)
        const urlValidation = this.urlValidator.validateURL(url);
        if (!urlValidation.allowed) {
            return `Error: URL blocked - ${urlValidation.reason}`;
        }
        // Check for external URL confirmation (Property 18: External URL Confirmation)
        if (urlValidation.requiresConfirmation) {
            if (this.requestConfirmation) {
                const confirmed = await this.requestConfirmation(`Do you want to navigate to external URL: ${url}?`);
                if (!confirmed) {
                    return 'Navigation cancelled: User denied access to external URL.';
                }
            }
            // If no confirmation handler, proceed but log warning
        }
        if (!this.browser) {
            // Lazy load puppeteer only when needed
            if (!puppeteer) {
                puppeteer = require('puppeteer');
            }
            // Validate browser launch arguments (Property 14: Browser Sandbox Flag Validation)
            const defaultArgs = this.getSecureBrowserArgs();
            const argsValidation = this.urlValidator.validateBrowserArgs(defaultArgs);
            // Log any warnings
            if (argsValidation.warnings.length > 0) {
                console.warn('Browser launch warnings:', argsValidation.warnings);
            }
            try {
                this.browser = await puppeteer.launch({
                    headless: true,
                    args: argsValidation.sanitizedArgs,
                });
                this.page = await this.browser.newPage();
                // Set default timeout (Property 16: Browser Timeout Enforcement)
                const timeout = this.urlValidator.getTimeout();
                this.page.setDefaultTimeout(timeout);
                this.page.setDefaultNavigationTimeout(timeout);
            }
            catch (launchError) {
                await this.cleanupOnError();
                throw new Error(`Failed to launch browser: ${launchError.message}`);
            }
        }
        if (!this.page) {
            throw new Error('Browser page not initialized.');
        }
        try {
            // Navigate with timeout enforcement (Property 16)
            const timeout = this.urlValidator.getTimeout();
            await this.page.goto(url, {
                waitUntil: 'domcontentloaded',
                timeout,
            });
            return `Navigated to ${url}`;
        }
        catch (navError) {
            if (navError.name === 'TimeoutError') {
                return `Error: Navigation timed out after ${this.urlValidator.getTimeout()}ms`;
            }
            throw navError;
        }
    }
    /**
     * Get secure browser launch arguments.
     * By default, does NOT include --no-sandbox for security.
     */
    getSecureBrowserArgs() {
        // Only include safe arguments by default
        // --no-sandbox is NOT included unless explicitly allowed in config
        const config = this.urlValidator.getConfig();
        if (config.allowNoSandbox) {
            return ['--no-sandbox', '--disable-setuid-sandbox'];
        }
        // Secure defaults - no sandbox bypass
        return [
            '--disable-dev-shm-usage', // Helps with memory in containers
        ];
    }
    async click(selector) {
        if (!this.page) {
            return "Error: Browser not open. Use 'launch' first.";
        }
        if (!selector) {
            return 'Error: Selector required for click.';
        }
        try {
            await this.page.click(selector);
            return `Clicked ${selector}`;
        }
        catch (e) {
            await this.cleanupOnError();
            throw e;
        }
    }
    async type(selector, text) {
        if (!this.page) {
            return "Error: Browser not open. Use 'launch' first.";
        }
        if (!selector || !text) {
            return 'Error: Selector and text required for type.';
        }
        try {
            await this.page.type(selector, text);
            return `Typed into ${selector}`;
        }
        catch (e) {
            await this.cleanupOnError();
            throw e;
        }
    }
    async read() {
        if (!this.page) {
            return "Error: Browser not open. Use 'launch' first.";
        }
        try {
            // Simple text extraction
            const content = await this.page.evaluate(() => document.body.innerText);
            return content;
        }
        catch (e) {
            await this.cleanupOnError();
            throw e;
        }
    }
    async close() {
        await this.cleanup();
        return 'Browser closed.';
    }
    /**
     * Clean up browser resources.
     */
    async cleanup() {
        if (this.browser) {
            try {
                await this.browser.close();
            }
            catch {
                // Ignore close errors
            }
            this.browser = null;
            this.page = null;
        }
    }
    /**
     * Clean up on error - ensures browser is properly disposed.
     * Implements Property 17: Browser Cleanup on Error
     */
    async cleanupOnError() {
        await this.cleanup();
    }
    /**
     * Check if browser is currently open.
     */
    isOpen() {
        return this.browser !== null;
    }
    /**
     * Dispose of browser resources.
     * Should be called when the tool is no longer needed.
     */
    async dispose() {
        await this.cleanup();
    }
}
exports.BrowserTool = BrowserTool;
//# sourceMappingURL=BrowserTool.js.map