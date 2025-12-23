import * as fs from 'fs';
import * as path from 'path';

/**
 * Feature: feature-based-architecture, Property 3: Webview Feature Structure Mirroring
 *
 * For any feature directory in src/features, there should exist a corresponding
 * directory with the same name in src/webview/features (or a known mapping)
 *
 * Validates: Requirements 1.5
 */
describe('Property 3: Webview Feature Structure Mirroring', () => {
  const backendFeaturesDir = path.join(__dirname, '../../features');
  const webviewFeaturesDir = path.join(__dirname, '../../webview/features');

  // Define known mappings between backend and webview feature names
  // Some features have different naming conventions between backend and webview
  const featureNameMappings: Record<string, string> = {
    'build-mode': 'build',
    'personas': 'userbase',
  };

  // Inverse mapping
  const inverseFeatureNameMappings: Record<string, string> = {
    'build': 'build-mode',
    'userbase': 'personas',
  };

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

    // Core features that should exist in both
    const coreFeatures = ['chat', 'feedback', 'settings'];
    coreFeatures.forEach((feature) => {
      expect(backendFeatures).toContain(feature);
      expect(webviewFeatures).toContain(feature);
    });

    // Verify mapped features exist in both (with name translation)
    Object.entries(featureNameMappings).forEach(([backend, webview]) => {
      if (backendFeatures.includes(backend)) {
        expect(webviewFeatures).toContain(webview);
      }
    });
  });

  it('should have corresponding webview directory for each backend feature', () => {
    // Get all backend feature directories
    const backendFeatures = fs
      .readdirSync(backendFeaturesDir, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);

    // For each backend feature, verify a corresponding webview directory exists
    backendFeatures.forEach((featureName) => {
      // Use mapped name if available
      const webviewName = featureNameMappings[featureName] || featureName;
      const webviewFeaturePath = path.join(webviewFeaturesDir, webviewName);
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
      // Use inverse mapping if available
      const backendName = inverseFeatureNameMappings[featureName] || featureName;
      expect(backendFeatures).toContain(backendName);
    });
  });
});
