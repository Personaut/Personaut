import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

/**
 * Feature: feature-based-architecture, Property 5: Utility File Naming
 *
 * For any TypeScript file exporting utility functions,
 * the filename should use camelCase
 *
 * Validates: Requirements 15.3
 */
describe('Property 5: Utility File Naming', () => {
  const srcDir = path.join(__dirname, '../..');

  /**
   * Helper function to recursively get all TypeScript files
   */
  function getAllTypeScriptFiles(dirPath: string): string[] {
    const files: string[] = [];

    if (!fs.existsSync(dirPath)) {
      return files;
    }

    const items = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);

      if (item.isDirectory()) {
        // Skip node_modules, test directories, mocks, and other non-source directories
        if (
          !['node_modules', 'out', 'dist', '.git', '__mocks__', '__tests__'].includes(item.name)
        ) {
          files.push(...getAllTypeScriptFiles(fullPath));
        }
      } else if (item.isFile() && (item.name.endsWith('.ts') || item.name.endsWith('.tsx'))) {
        // Skip test files, mock files, and index files
        if (
          !item.name.endsWith('.test.ts') &&
          !item.name.endsWith('.test.tsx') &&
          !item.name.endsWith('.spec.ts') &&
          !item.name.endsWith('.spec.tsx') &&
          item.name !== 'index.ts' &&
          item.name !== 'index.tsx' &&
          !fullPath.includes('__mocks__')
        ) {
          files.push(fullPath);
        }
      }
    }

    return files;
  }

  /**
   * Check if a string is in camelCase format
   */
  function isCamelCase(str: string): boolean {
    // camelCase: starts with lowercase, followed by alphanumeric
    return /^[a-z][a-zA-Z0-9]*$/.test(str);
  }

  /**
   * Check if a file exports utility functions (functions but not classes)
   */
  function exportsUtilityFunctions(filePath: string): boolean {
    const content = fs.readFileSync(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

    let hasFunctionExport = false;
    let hasClassExport = false;

    function visit(node: ts.Node) {
      // Check for exported functions
      if (ts.isFunctionDeclaration(node)) {
        const hasExportModifier = node.modifiers?.some(
          (mod) => mod.kind === ts.SyntaxKind.ExportKeyword
        );
        if (hasExportModifier) {
          hasFunctionExport = true;
        }
      }

      // Check for exported classes
      if (ts.isClassDeclaration(node)) {
        const hasExportModifier = node.modifiers?.some(
          (mod) => mod.kind === ts.SyntaxKind.ExportKeyword
        );
        if (hasExportModifier) {
          hasClassExport = true;
        }
      }

      // Check for variable declarations that might be arrow functions
      if (ts.isVariableStatement(node)) {
        const hasExportModifier = node.modifiers?.some(
          (mod) => mod.kind === ts.SyntaxKind.ExportKeyword
        );
        if (hasExportModifier) {
          node.declarationList.declarations.forEach((decl) => {
            if (
              decl.initializer &&
              (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer))
            ) {
              hasFunctionExport = true;
            }
          });
        }
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);

    // Only consider it a utility file if it exports functions but not classes
    return hasFunctionExport && !hasClassExport;
  }

  it('should use camelCase for files exporting utility functions', () => {
    const allFiles = getAllTypeScriptFiles(srcDir);

    // Verify we have files to test
    expect(allFiles.length).toBeGreaterThan(0);

    const violations: string[] = [];

    allFiles.forEach((filePath) => {
      // Only check files in utils directories or files that export utility functions
      const isInUtilsDir = filePath.includes('/utils/');

      if (isInUtilsDir && exportsUtilityFunctions(filePath)) {
        const fileName = path.basename(filePath, path.extname(filePath));

        // Allow PascalCase for well-known patterns (Parser, Validator, Formatter, etc.)
        const isPascalCaseExemptPattern = /^[A-Z][a-zA-Z]*(Parser|Validator|Formatter|Helper|Builder|Factory)$/;
        if (isPascalCaseExemptPattern.test(fileName)) {
          return; // Skip this file, it's an acceptable naming pattern
        }

        if (!isCamelCase(fileName)) {
          violations.push(filePath);
        }
      }
    });

    if (violations.length > 0) {
      console.log('Files with naming violations:');
      violations.forEach((v) => console.log(`  - ${v}`));
    }

    expect(violations).toEqual([]);
  });

  it('should validate camelCase pattern', () => {
    const validNames = [
      'stringUtils',
      'arrayUtils',
      'objectUtils',
      'timeUtils',
      'formatters',
      'helpers',
      'validators',
    ];

    validNames.forEach((name) => {
      expect(isCamelCase(name)).toBe(true);
    });
  });

  it('should reject non-camelCase names', () => {
    const invalidNames = [
      'StringUtils',
      'ArrayUtils',
      'string-utils',
      'string_utils',
      'STRING_UTILS',
      'Formatters',
      'HELPERS',
    ];

    invalidNames.forEach((name) => {
      expect(isCamelCase(name)).toBe(false);
    });
  });
});
