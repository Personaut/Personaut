import * as fs from 'fs';
import * as path from 'path';

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
      // Filter out convention directories that are not part of feature structure
      const conventionDirs = ['__tests__', '__mocks__', '_deprecated'];
      const subdirs = fs
        .readdirSync(featurePath, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name)
        .filter((name) => !conventionDirs.includes(name));

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

    // Define known mappings between backend and webview feature names
    const featureNameMappings: Record<string, string> = {
      'build-mode': 'build',
      'personas': 'userbase',
    };

    // Verify key overlapping features exist in both
    const coreFeatures = ['chat', 'feedback', 'settings'];
    coreFeatures.forEach((feature) => {
      expect(backendFeatures).toContain(feature);
      expect(webviewFeatures).toContain(feature);
    });

    // Verify mapped features exist
    Object.entries(featureNameMappings).forEach(([backend, webview]) => {
      if (backendFeatures.includes(backend)) {
        expect(webviewFeatures).toContain(webview);
      }
    });
  });
});
