import * as fs from 'fs';
import * as path from 'path';

/**
 * Feature: feature-based-architecture, Property 17: Feature Handler Interface Implementation
 *
 * For any feature handler class, the class should implement the IFeatureHandler interface
 *
 * Validates: Requirements 10.1, 10.2
 */
describe('Property 17: Feature Handler Interface Implementation', () => {
  const featuresDir = path.join(__dirname, '../../features');

  /**
   * Helper function to read all TypeScript files in a directory
   */
  function getTypeScriptFiles(dir: string): string[] {
    const files: string[] = [];

    if (!fs.existsSync(dir)) {
      return files;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        files.push(...getTypeScriptFiles(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Helper function to check if a file contains a handler class
   */
  function isHandlerFile(filePath: string): boolean {
    return filePath.includes('/handlers/') && !filePath.endsWith('.test.ts');
  }

  /**
   * Helper function to check if file content implements IFeatureHandler
   */
  function implementsIFeatureHandler(content: string): boolean {
    // Check for "implements IFeatureHandler" in the class declaration
    const implementsPattern = /class\s+\w+\s+implements\s+.*IFeatureHandler/;
    return implementsPattern.test(content);
  }

  /**
   * Helper function to check if file imports IFeatureHandler
   */
  function importsIFeatureHandler(content: string): boolean {
    // Check for import of IFeatureHandler
    const importPattern = /import\s+{[^}]*IFeatureHandler[^}]*}\s+from/;
    return importPattern.test(content);
  }

  /**
   * Helper function to check if file has a handle method
   */
  function hasHandleMethod(content: string): boolean {
    // Check for handle method signature
    const handlePattern =
      /async\s+handle\s*\(\s*message\s*:\s*\w+,\s*webview\s*:\s*[^)]+\)\s*:\s*Promise<void>/;
    return handlePattern.test(content);
  }

  it('should have all handler files implement IFeatureHandler interface', () => {
    // Check if features directory exists
    if (!fs.existsSync(featuresDir)) {
      throw new Error(`Features directory does not exist: ${featuresDir}`);
    }

    // Get all TypeScript files in features directory
    const allFiles = getTypeScriptFiles(featuresDir);

    // Filter to only handler files
    const handlerFiles = allFiles.filter(isHandlerFile);

    // Verify we have at least one handler file
    expect(handlerFiles.length).toBeGreaterThan(0);

    // Check each handler file
    const violations: string[] = [];

    handlerFiles.forEach((handlerFile) => {
      const content = fs.readFileSync(handlerFile, 'utf-8');
      const fileName = path.basename(handlerFile);

      // Check if it implements IFeatureHandler
      if (!implementsIFeatureHandler(content)) {
        violations.push(`${fileName}: Does not implement IFeatureHandler interface`);
      }

      // Check if it imports IFeatureHandler
      if (!importsIFeatureHandler(content)) {
        violations.push(`${fileName}: Does not import IFeatureHandler`);
      }

      // Check if it has a handle method
      if (!hasHandleMethod(content)) {
        violations.push(`${fileName}: Does not have a handle method with correct signature`);
      }
    });

    // Report all violations
    if (violations.length > 0) {
      throw new Error(
        `Handler interface violations found:\n${violations.map((v) => `  - ${v}`).join('\n')}`
      );
    }
  });

  it('should have handler files in the handlers subdirectory of each feature', () => {
    // Get all feature directories
    const featureDirs = fs
      .readdirSync(featuresDir, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);

    // Verify we have at least one feature
    expect(featureDirs.length).toBeGreaterThan(0);

    // Check each feature has a handlers directory
    featureDirs.forEach((featureDir) => {
      const handlersDir = path.join(featuresDir, featureDir, 'handlers');

      // Handlers directory should exist
      expect(fs.existsSync(handlersDir)).toBe(true);

      // Get all TypeScript files in handlers directory
      const handlerFiles = fs
        .readdirSync(handlersDir)
        .filter((file) => file.endsWith('.ts') && !file.endsWith('.test.ts'));

      // If there are handler files, they should follow naming convention
      handlerFiles.forEach((file) => {
        expect(file).toMatch(/Handler\.ts$/);
      });
    });
  });

  it('should have handler classes with correct naming convention', () => {
    // Get all handler files
    const allFiles = getTypeScriptFiles(featuresDir);
    const handlerFiles = allFiles.filter(isHandlerFile);

    handlerFiles.forEach((handlerFile) => {
      const content = fs.readFileSync(handlerFile, 'utf-8');
      const fileName = path.basename(handlerFile, '.ts');

      // Extract class name from file
      const classPattern = /export\s+class\s+(\w+)\s+implements/;
      const match = content.match(classPattern);

      if (match) {
        const className = match[1];

        // Class name should match file name
        expect(className).toBe(fileName);

        // Class name should end with "Handler"
        expect(className).toMatch(/Handler$/);
      }
    });
  });
});
