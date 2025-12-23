/**
 * ScreenshotService - Captures screenshots using Puppeteer
 *
 * Responsibilities:
 * - Initialize headless browser
 * - Navigate to URLs and capture screenshots
 * - Handle viewport configuration
 * - Manage browser lifecycle
 *
 * Validates: Build Mode Requirements - Screenshot Capture
 */

import puppeteer, { Browser, Page } from 'puppeteer';

export interface ScreenshotOptions {
    url: string;
    viewport?: { width: number; height: number };
    waitForSelector?: string;
    waitForTimeout?: number;
    fullPage?: boolean;
}

export interface ScreenshotResult {
    success: boolean;
    data?: Buffer;
    error?: string;
}

export class ScreenshotService {
    private browser: Browser | null = null;

    /**
     * Initialize Puppeteer browser
     */
    async initialize(): Promise<void> {
        if (this.browser) {
            return; // Already initialized
        }

        try {
            this.browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage', // Overcome limited resource problems
                ],
            });

            console.log('[ScreenshotService] Browser initialized');
        } catch (error: any) {
            console.error('[ScreenshotService] Failed to initialize browser:', error);
            throw new Error(`Failed to initialize browser: ${error.message}`);
        }
    }

    /**
     * Capture a screenshot of a URL
     */
    async capture(options: ScreenshotOptions): Promise<ScreenshotResult> {
        if (!this.browser) {
            return {
                success: false,
                error: 'Browser not initialized. Call initialize() first.',
            };
        }

        const {
            url,
            viewport = { width: 1280, height: 720 },
            waitForSelector,
            waitForTimeout = 2000,
            fullPage = true,
        } = options;

        let page: Page | null = null;

        try {
            page = await this.browser.newPage();
            await page.setViewport(viewport);

            console.log(`[ScreenshotService] Navigating to ${url}`);

            await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: 30000,
            });

            // Wait for specific selector if provided
            if (waitForSelector) {
                console.log(`[ScreenshotService] Waiting for selector: ${waitForSelector}`);
                await page.waitForSelector(waitForSelector, { timeout: 10000 });
            }

            // Additional wait for dynamic content
            if (waitForTimeout > 0) {
                await new Promise(resolve => setTimeout(resolve, waitForTimeout));
            }

            console.log(`[ScreenshotService] Capturing screenshot`);
            const screenshot = await page.screenshot({
                fullPage,
                type: 'png',
            });

            return {
                success: true,
                data: screenshot as Buffer,
            };
        } catch (error: any) {
            console.error('[ScreenshotService] Screenshot failed:', error);
            return {
                success: false,
                error: error.message || 'Screenshot capture failed',
            };
        } finally {
            if (page) {
                await page.close();
            }
        }
    }

    /**
     * Capture multiple screenshots
     */
    async captureMultiple(
        urls: ScreenshotOptions[]
    ): Promise<ScreenshotResult[]> {
        const results: ScreenshotResult[] = [];

        for (const options of urls) {
            const result = await this.capture(options);
            results.push(result);
        }

        return results;
    }

    /**
     * Close the browser
     */
    async close(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            console.log('[ScreenshotService] Browser closed');
        }
    }

    /**
     * Check if browser is initialized
     */
    isInitialized(): boolean {
        return this.browser !== null;
    }
}
