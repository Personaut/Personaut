import * as fs from 'fs';
import * as path from 'path';

/**
 * Feature: feature-based-architecture, Property 6: Test File Naming
 *
 * For any test file, the filename should match the component name
 * with .test or .spec suffix
 *
 * Validates: Requirements 15.4
 */
describe('Property 6: Test File Naming', () => {
  const srcDir = path.join(__dirname, '../..');

  /**
   * Helper function to recursively get all test files
   */
  function getAllTestFiles(dirPath: string): string[] {
    const files: string[] = [];

    if (!fs.existsSync(dirPath)) {
      return files;
    }

    const items = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);

      if (item.isDirectory()) {
        // Skip node_modules and other non-source directories
        if (!['node_modules', 'out', 'dist', '.git'].includes(item.name)) {
          files.push(...getAllTestFiles(fullPath));
        }
      } else if (
        item.isFile() &&
        (item.name.endsWith('.test.ts') ||
          item.name.endsWith('.test.tsx') ||
          item.name.endsWith('.spec.ts') ||
          item.name.endsWith('.spec.tsx'))
      ) {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Check if a test file has the correct suffix
   */
  function hasCorrectTestSuffix(fileName: string): boolean {
    return (
      fileName.endsWith('.test.ts') ||
      fileName.endsWith('.test.tsx') ||
      fileName.endsWith('.spec.ts') ||
      fileName.endsWith('.spec.tsx')
    );
  }

  /**
   * Check if the test file name matches a corresponding source file
   */
  function hasMatchingSourceFile(testFilePath: string): boolean {
    const dir = path.dirname(testFilePath);
    const fileName = path.basename(testFilePath);

    // Extract the base name without test suffix
    let baseName = fileName;
    if (fileName.endsWith('.test.ts')) {
      baseName = fileName.replace('.test.ts', '.ts');
    } else if (fileName.endsWith('.test.tsx')) {
      baseName = fileName.replace('.test.tsx', '.tsx');
    } else if (fileName.endsWith('.spec.ts')) {
      baseName = fileName.replace('.spec.ts', '.ts');
    } else if (fileName.endsWith('.spec.tsx')) {
      baseName = fileName.replace('.spec.tsx', '.tsx');
    }

    // Check if corresponding source file exists in the same directory
    const sourceFilePath = path.join(dir, baseName);
    if (fs.existsSync(sourceFilePath)) {
      return true;
    }

    // If test is in __tests__ directory, check sibling directories
    if (dir.includes('__tests__')) {
      const parentDir = path.dirname(dir);
      const siblingDirs = ['services', 'handlers', 'types', 'components', ''];

      for (const siblingDir of siblingDirs) {
        const siblingPath = siblingDir
          ? path.join(parentDir, siblingDir, baseName)
          : path.join(parentDir, baseName);
        if (fs.existsSync(siblingPath)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Get the base name of a test file (without test suffix and extension)
   */
  function getTestBaseName(fileName: string): string {
    // Handle property tests first (longer pattern)
    if (fileName.endsWith('.property.test.ts')) {
      return fileName.replace('.property.test.ts', '');
    }
    if (fileName.endsWith('.property.test.tsx')) {
      return fileName.replace('.property.test.tsx', '');
    }
    // Then handle regular tests
    if (fileName.endsWith('.test.ts')) {
      return fileName.replace('.test.ts', '');
    }
    if (fileName.endsWith('.test.tsx')) {
      return fileName.replace('.test.tsx', '');
    }
    if (fileName.endsWith('.spec.ts')) {
      return fileName.replace('.spec.ts', '');
    }
    if (fileName.endsWith('.spec.tsx')) {
      return fileName.replace('.spec.tsx', '');
    }
    return fileName;
  }

  it('should have correct test suffix (.test or .spec)', () => {
    const allTestFiles = getAllTestFiles(srcDir);

    // Verify we have test files
    expect(allTestFiles.length).toBeGreaterThan(0);

    allTestFiles.forEach((testFile) => {
      const fileName = path.basename(testFile);
      expect(hasCorrectTestSuffix(fileName)).toBe(true);
    });
  });

  it('should have matching source files for unit tests', () => {
    const allTestFiles = getAllTestFiles(srcDir);

    const violations: string[] = [];

    allTestFiles.forEach((testFile) => {
      const fileName = path.basename(testFile);

      // Skip property tests as they don't have matching source files
      if (fileName.includes('.property.test.')) {
        return;
      }

      // Skip integration tests as they don't have matching source files
      if (testFile.includes('__tests__/integration/')) {
        return;
      }

      if (!hasMatchingSourceFile(testFile)) {
        violations.push(testFile);
      }
    });

    if (violations.length > 0) {
      console.log('Test files without matching source files:');
      violations.forEach((v) => console.log(`  - ${v}`));
    }

    expect(violations).toEqual([]);
  });

  it('should validate test file naming patterns', () => {
    const validTestNames = [
      'Agent.test.ts',
      'ChatHandler.test.tsx',
      'stringUtils.spec.ts',
      'SidebarProvider.test.ts',
      'directory-naming.property.test.ts',
    ];

    validTestNames.forEach((name) => {
      expect(hasCorrectTestSuffix(name)).toBe(true);
    });
  });

  it('should reject invalid test file names', () => {
    const invalidTestNames = [
      'Agent.tests.ts',
      'ChatHandler.testing.tsx',
      'stringUtils.ts',
      'SidebarProvider.tsx',
      'test-Agent.ts',
    ];

    invalidTestNames.forEach((name) => {
      expect(hasCorrectTestSuffix(name)).toBe(false);
    });
  });

  it('should extract correct base names from test files', () => {
    const testCases = [
      { input: 'Agent.test.ts', expected: 'Agent' },
      { input: 'ChatHandler.test.tsx', expected: 'ChatHandler' },
      { input: 'stringUtils.spec.ts', expected: 'stringUtils' },
      { input: 'directory-naming.property.test.ts', expected: 'directory-naming' },
    ];

    testCases.forEach(({ input, expected }) => {
      expect(getTestBaseName(input)).toBe(expected);
    });
  });
});
