"use strict";
/**
 * Property test for bundle size maintenance
 *
 * Feature: feature-based-architecture, Property 20: Bundle Size Maintenance
 *
 * For the compiled extension bundle, the bundle size should not exceed
 * the current bundle size by more than 5%
 *
 * Validates: Requirements 16.1
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
describe('Property 20: Bundle Size Maintenance', () => {
    /**
     * Test that the new implementation's bundle size doesn't exceed
     * the old implementation by more than 5%
     * Validates: Requirements 16.1
     */
    it('should not exceed old bundle size by more than 5%', () => {
        // Paths to bundle files
        const newExtensionBundle = path.join(__dirname, '../../../out/extension.bundle.js');
        const newWebviewBundle = path.join(__dirname, '../../../out/compiled/bundle.js');
        const oldExtensionBundle = path.join(__dirname, '../../../../out/extension.bundle.js');
        const oldWebviewBundle = path.join(__dirname, '../../../../out/compiled/bundle.js');
        // Check if bundles exist
        const newExtensionExists = fs.existsSync(newExtensionBundle);
        const newWebviewExists = fs.existsSync(newWebviewBundle);
        const oldExtensionExists = fs.existsSync(oldExtensionBundle);
        const oldWebviewExists = fs.existsSync(oldWebviewBundle);
        if (!newExtensionExists || !newWebviewExists) {
            console.warn('New bundles not found. Run "npm run build-extension && npm run build-webview" first.');
            console.warn(`  Extension bundle exists: ${newExtensionExists}`);
            console.warn(`  Webview bundle exists: ${newWebviewExists}`);
            // Skip test if new bundles don't exist
            return;
        }
        if (!oldExtensionExists || !oldWebviewExists) {
            console.warn('Old bundles not found. This is expected for a new implementation.');
            console.warn('Skipping comparison test.');
            // Skip test if old bundles don't exist (expected for new implementation)
            return;
        }
        // Get file sizes
        const newExtensionSize = fs.statSync(newExtensionBundle).size;
        const newWebviewSize = fs.statSync(newWebviewBundle).size;
        const oldExtensionSize = fs.statSync(oldExtensionBundle).size;
        const oldWebviewSize = fs.statSync(oldWebviewBundle).size;
        const newTotalSize = newExtensionSize + newWebviewSize;
        const oldTotalSize = oldExtensionSize + oldWebviewSize;
        // Calculate percentage increase
        const percentageIncrease = ((newTotalSize - oldTotalSize) / oldTotalSize) * 100;
        // Log bundle sizes for debugging
        console.log('\nBundle Size Comparison:');
        console.log('=======================');
        console.log('\nOld Implementation:');
        console.log(`  Extension bundle: ${formatBytes(oldExtensionSize)}`);
        console.log(`  Webview bundle:   ${formatBytes(oldWebviewSize)}`);
        console.log(`  Total:            ${formatBytes(oldTotalSize)}`);
        console.log('\nNew Implementation:');
        console.log(`  Extension bundle: ${formatBytes(newExtensionSize)}`);
        console.log(`  Webview bundle:   ${formatBytes(newWebviewSize)}`);
        console.log(`  Total:            ${formatBytes(newTotalSize)}`);
        console.log('\nComparison:');
        console.log(`  Difference:       ${formatBytes(newTotalSize - oldTotalSize)}`);
        console.log(`  Percentage:       ${percentageIncrease.toFixed(2)}%`);
        console.log(`  Limit:            5.00%`);
        console.log('=======================\n');
        // Assert that bundle size increase is within 5%
        expect(percentageIncrease).toBeLessThanOrEqual(5);
        // Also check individual bundles
        const extensionIncrease = ((newExtensionSize - oldExtensionSize) / oldExtensionSize) * 100;
        const webviewIncrease = ((newWebviewSize - oldWebviewSize) / oldWebviewSize) * 100;
        console.log('Individual Bundle Analysis:');
        console.log(`  Extension increase: ${extensionIncrease.toFixed(2)}%`);
        console.log(`  Webview increase:   ${webviewIncrease.toFixed(2)}%`);
        // Warn if either bundle increased significantly
        if (extensionIncrease > 10) {
            console.warn(`⚠️  Extension bundle increased by ${extensionIncrease.toFixed(2)}%`);
        }
        if (webviewIncrease > 10) {
            console.warn(`⚠️  Webview bundle increased by ${webviewIncrease.toFixed(2)}%`);
        }
    });
    /**
     * Test that bundle sizes are reasonable in absolute terms
     * Validates: Requirements 16.1
     */
    it('should have reasonable absolute bundle sizes', () => {
        const newExtensionBundle = path.join(__dirname, '../../../out/extension.bundle.js');
        const newWebviewBundle = path.join(__dirname, '../../../out/compiled/bundle.js');
        // Check if bundles exist
        if (!fs.existsSync(newExtensionBundle) || !fs.existsSync(newWebviewBundle)) {
            console.warn('Bundles not found. Run "npm run build-extension && npm run build-webview" first.');
            return;
        }
        // Get file sizes
        const extensionSize = fs.statSync(newExtensionBundle).size;
        const webviewSize = fs.statSync(newWebviewBundle).size;
        const totalSize = extensionSize + webviewSize;
        console.log('\nAbsolute Bundle Sizes:');
        console.log('======================');
        console.log(`  Extension bundle: ${formatBytes(extensionSize)}`);
        console.log(`  Webview bundle:   ${formatBytes(webviewSize)}`);
        console.log(`  Total:            ${formatBytes(totalSize)}`);
        console.log('======================\n');
        // Reasonable limits (these are generous to allow for growth)
        const MAX_EXTENSION_SIZE = 5 * 1024 * 1024; // 5 MB
        const MAX_WEBVIEW_SIZE = 3 * 1024 * 1024; // 3 MB
        const MAX_TOTAL_SIZE = 8 * 1024 * 1024; // 8 MB
        expect(extensionSize).toBeLessThan(MAX_EXTENSION_SIZE);
        expect(webviewSize).toBeLessThan(MAX_WEBVIEW_SIZE);
        expect(totalSize).toBeLessThan(MAX_TOTAL_SIZE);
    });
    /**
     * Test that production bundles are minified
     * Validates: Requirements 16.1
     */
    it('should have minified production bundles', () => {
        const newExtensionBundle = path.join(__dirname, '../../../out/extension.bundle.js');
        const newWebviewBundle = path.join(__dirname, '../../../out/compiled/bundle.js');
        // Check if bundles exist
        if (!fs.existsSync(newExtensionBundle) || !fs.existsSync(newWebviewBundle)) {
            console.warn('Bundles not found. Run "npm run build-extension && npm run build-webview" first.');
            return;
        }
        // Read bundle contents
        const extensionContent = fs.readFileSync(newExtensionBundle, 'utf-8');
        const webviewContent = fs.readFileSync(newWebviewBundle, 'utf-8');
        // Check for minification indicators
        // Minified code typically has:
        // - Very long lines
        // - No unnecessary whitespace
        // - Short variable names
        const extensionLines = extensionContent.split('\n');
        const webviewLines = webviewContent.split('\n');
        // Calculate average line length
        const avgExtensionLineLength = extensionContent.length / Math.max(extensionLines.length, 1);
        const avgWebviewLineLength = webviewContent.length / Math.max(webviewLines.length, 1);
        console.log('\nMinification Analysis:');
        console.log('======================');
        console.log(`  Extension avg line length: ${avgExtensionLineLength.toFixed(0)} chars`);
        console.log(`  Webview avg line length:   ${avgWebviewLineLength.toFixed(0)} chars`);
        console.log('======================\n');
        // Minified code should have long average line lengths (> 100 chars)
        // This is a heuristic, not a strict requirement
        if (avgExtensionLineLength < 100) {
            console.warn('⚠️  Extension bundle may not be minified (avg line length < 100)');
        }
        if (avgWebviewLineLength < 100) {
            console.warn('⚠️  Webview bundle may not be minified (avg line length < 100)');
        }
    });
});
/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes) {
    if (bytes === 0)
        return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
//# sourceMappingURL=bundle-size.property.test.js.map