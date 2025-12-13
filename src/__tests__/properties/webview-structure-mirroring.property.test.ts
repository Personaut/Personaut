import * as fs from 'fs';
import * as path from 'path';

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
