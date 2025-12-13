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
 * Feature: feature-based-architecture, Property 3: Webview Feature Structure Mirroring
 *
 * For any feature directory in src/features, there should exist a corresponding
 * directory with the same name in src/webview/features
 *
 * Validates: Requirements 1.5
 */
describe('Property 3: Webview Feature Structure Mirroring', () => {
    const backendFeaturesDir = path.join(__dirname, '../../features');
    const webviewFeaturesDir = path.join(__dirname, '../../webview/features');
    it('should have matching feature directories in backend and webview', () => {
        // Check if both directories exist
        if (!fs.existsSync(backendFeaturesDir)) {
            throw new Error(`Backend features directory does not exist: ${backendFeaturesDir}`);
        }
        if (!fs.existsSync(webviewFeaturesDir)) {
            throw new Error(`Webview features directory does not exist: ${webviewFeaturesDir}`);
        }
        // Get all backend feature directories
        const backendFeatures = fs
            .readdirSync(backendFeaturesDir, { withFileTypes: true })
            .filter((dirent) => dirent.isDirectory())
            .map((dirent) => dirent.name)
            .sort();
        // Get all webview feature directories
        const webviewFeatures = fs
            .readdirSync(webviewFeaturesDir, { withFileTypes: true })
            .filter((dirent) => dirent.isDirectory())
            .map((dirent) => dirent.name)
            .sort();
        // Verify we have at least one feature
        expect(backendFeatures.length).toBeGreaterThan(0);
        expect(webviewFeatures.length).toBeGreaterThan(0);
        // Verify backend and webview have the same feature directories
        expect(webviewFeatures).toEqual(backendFeatures);
    });
    it('should have corresponding webview directory for each backend feature', () => {
        // Get all backend feature directories
        const backendFeatures = fs
            .readdirSync(backendFeaturesDir, { withFileTypes: true })
            .filter((dirent) => dirent.isDirectory())
            .map((dirent) => dirent.name);
        // For each backend feature, verify a corresponding webview directory exists
        backendFeatures.forEach((featureName) => {
            const webviewFeaturePath = path.join(webviewFeaturesDir, featureName);
            expect(fs.existsSync(webviewFeaturePath)).toBe(true);
            // Verify it's actually a directory
            const stats = fs.statSync(webviewFeaturePath);
            expect(stats.isDirectory()).toBe(true);
        });
    });
    it('should not have orphaned webview feature directories', () => {
        // Get all backend feature directories
        const backendFeatures = fs
            .readdirSync(backendFeaturesDir, { withFileTypes: true })
            .filter((dirent) => dirent.isDirectory())
            .map((dirent) => dirent.name);
        // Get all webview feature directories
        const webviewFeatures = fs
            .readdirSync(webviewFeaturesDir, { withFileTypes: true })
            .filter((dirent) => dirent.isDirectory())
            .map((dirent) => dirent.name);
        // Verify no webview feature exists without a corresponding backend feature
        webviewFeatures.forEach((featureName) => {
            expect(backendFeatures).toContain(featureName);
        });
    });
});
//# sourceMappingURL=webview-structure-mirroring.property.test.js.map