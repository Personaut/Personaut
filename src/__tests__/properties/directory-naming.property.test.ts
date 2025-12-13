import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Feature: feature-based-architecture, Property 2: Directory Naming Convention
 *
 * For any directory in the features, core, or shared directories,
 * the directory name should follow kebab-case naming convention
 *
 * Validates: Requirements 1.1, 1.6
 */
describe('Property 2: Directory Naming Convention', () => {
  const srcDir = path.join(__dirname, '../..');
  const rootDirs = ['features', 'core', 'shared'];

  /**
   * Helper function to recursively get all directories
   */
  function getAllDirectories(dirPath: string): string[] {
    const directories: string[] = [];

    if (!fs.existsSync(dirPath)) {
      return directories;
    }

    const items = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const item of items) {
      if (item.isDirectory()) {
        const fullPath = path.join(dirPath, item.name);
        directories.push(fullPath);
        // Recursively get subdirectories
        directories.push(...getAllDirectories(fullPath));
      }
    }

    return directories;
  }

  /**
   * Check if a string is in kebab-case format
   */
  function isKebabCase(str: string): boolean {
    // Kebab-case: lowercase letters, numbers, and hyphens, no leading/trailing hyphens
    return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(str);
  }

  it('should use kebab-case for all directory names in features, core, and shared', () => {
    rootDirs.forEach((rootDir) => {
      const dirPath = path.join(srcDir, rootDir);

      if (!fs.existsSync(dirPath)) {
        throw new Error(`Root directory does not exist: ${dirPath}`);
      }

      const allDirs = getAllDirectories(dirPath);

      // Verify we have at least some directories
      expect(allDirs.length).toBeGreaterThan(0);

      allDirs.forEach((dir) => {
        const dirName = path.basename(dir);
        expect(isKebabCase(dirName)).toBe(true);
      });
    });
  });

  it('should verify kebab-case pattern with property-based testing', () => {
    fc.assert(
      fc.property(fc.constantFrom(...rootDirs), (rootDir) => {
        const dirPath = path.join(srcDir, rootDir);
        const allDirs = getAllDirectories(dirPath);

        allDirs.forEach((dir) => {
          const dirName = path.basename(dir);
          // Each directory name should match kebab-case pattern
          expect(dirName).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
        });
      }),
      { numRuns: 100 }
    );
  });

  it('should reject non-kebab-case directory names', () => {
    const invalidNames = [
      'CamelCase',
      'PascalCase',
      'snake_case',
      'SCREAMING_SNAKE_CASE',
      'kebab-Case',
      'Kebab-case',
      '-leading-hyphen',
      'trailing-hyphen-',
      'double--hyphen',
      'has spaces',
      'has.dots',
      'has123numbers', // This is actually valid kebab-case
    ];

    invalidNames.forEach((name) => {
      if (name === 'has123numbers') {
        // This should be valid
        expect(isKebabCase(name)).toBe(true);
      } else {
        expect(isKebabCase(name)).toBe(false);
      }
    });
  });

  it('should accept valid kebab-case directory names', () => {
    const validNames = [
      'chat',
      'personas',
      'build-mode',
      'feature-name',
      'multi-word-feature',
      'a',
      'ab',
      'a-b',
    ];

    validNames.forEach((name) => {
      expect(isKebabCase(name)).toBe(true);
    });
  });
});
