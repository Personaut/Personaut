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
 * Feature: feature-based-architecture, Property 1: Feature Module Structure Consistency
 *
 * For any feature module in the features directory, the module should contain
 * the same set of subdirectories (services, handlers, types) with consistent naming
 *
 * Validates: Requirements 1.2
 */
describe('Property 1: Feature Module Structure Consistency', () => {
    const featuresDir = path.join(__dirname, '../../features');
    const expectedSubdirs = ['services', 'handlers', 'types'];
    it('should have consistent subdirectories across all features', () => {
        // Check if features directory exists
        if (!fs.existsSync(featuresDir)) {
            throw new Error(`Features directory does not exist: ${featuresDir}`);
        }
        // Get all feature directories
        const featureDirs = fs
            .readdirSync(featuresDir, { withFileTypes: true })
            .filter((dirent) => dirent.isDirectory())
            .map((dirent) => dirent.name);
        // Verify we have at least one feature
        expect(featureDirs.length).toBeGreaterThan(0);
        // For each feature directory, verify it has the expected subdirectories
        featureDirs.forEach((featureDir) => {
            const featurePath = path.join(featuresDir, featureDir);
            const subdirs = fs
                .readdirSync(featurePath, { withFileTypes: true })
                .filter((dirent) => dirent.isDirectory())
                .map((dirent) => dirent.name);
            // Check that all expected subdirectories exist
            expectedSubdirs.forEach((expectedSubdir) => {
                expect(subdirs).toContain(expectedSubdir);
            });
            // Verify the feature has exactly the expected subdirectories (no extra ones)
            expect(subdirs.sort()).toEqual(expectedSubdirs.sort());
        });
    });
    it('should have matching feature names in backend and webview', () => {
        const webviewFeaturesDir = path.join(__dirname, '../../webview/features');
        // Check if webview features directory exists
        if (!fs.existsSync(webviewFeaturesDir)) {
            throw new Error(`Webview features directory does not exist: ${webviewFeaturesDir}`);
        }
        // Get all backend feature directories
        const backendFeatures = fs
            .readdirSync(featuresDir, { withFileTypes: true })
            .filter((dirent) => dirent.isDirectory())
            .map((dirent) => dirent.name)
            .sort();
        // Get all webview feature directories
        const webviewFeatures = fs
            .readdirSync(webviewFeaturesDir, { withFileTypes: true })
            .filter((dirent) => dirent.isDirectory())
            .map((dirent) => dirent.name)
            .sort();
        // Verify backend and webview have the same feature directories
        expect(webviewFeatures).toEqual(backendFeatures);
    });
});
//# sourceMappingURL=directory-structure.property.test.js.map