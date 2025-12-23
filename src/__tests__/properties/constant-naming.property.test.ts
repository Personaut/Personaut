import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

/**
 * Feature: feature-based-architecture, Property 9: Constant Naming
 *
 * For any global constant declaration, the constant name should
 * use SCREAMING_SNAKE_CASE
 *
 * Validates: Requirements 15.8
 */
describe('Property 9: Constant Naming', () => {
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
        if (!['node_modules', 'out', 'dist', '.git', '__mocks__'].includes(item.name)) {
          files.push(...getAllTypeScriptFiles(fullPath));
        }
      } else if (item.isFile() && (item.name.endsWith('.ts') || item.name.endsWith('.tsx'))) {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Check if a string is in SCREAMING_SNAKE_CASE format
   */
  function isScreamingSnakeCase(str: string): boolean {
    // SCREAMING_SNAKE_CASE: uppercase letters, numbers, and underscores
    return /^[A-Z][A-Z0-9_]*$/.test(str);
  }

  /**
   * Extract global constant declarations from a file
   */
  function extractGlobalConstants(filePath: string): Array<{ name: string; line: number }> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

    const constants: Array<{ name: string; line: number }> = [];

    function visit(node: ts.Node) {
      // Check for exported const declarations at module level
      if (ts.isVariableStatement(node)) {
        const hasExportModifier = node.modifiers?.some(
          (mod) => mod.kind === ts.SyntaxKind.ExportKeyword
        );

        // Check if it's a const declaration
        const isConst = node.declarationList.flags & ts.NodeFlags.Const;

        if (hasExportModifier && isConst) {
          node.declarationList.declarations.forEach((decl) => {
            if (ts.isIdentifier(decl.name)) {
              const name = decl.name.text;
              const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());

              // Skip if it's a function or class (these should use camelCase/PascalCase)
              if (decl.initializer) {
                const isFunction =
                  ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer);
                const isClass = ts.isClassExpression(decl.initializer);
                const isObject = ts.isObjectLiteralExpression(decl.initializer);

                // Only check primitive constants and arrays,
                // not functions, classes, or complex objects
                if (!isFunction && !isClass && !isObject) {
                  constants.push({ name, line: line + 1 });
                }
              }
            }
          });
        }
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    return constants;
  }

  it('should use SCREAMING_SNAKE_CASE for global constants', () => {
    const allFiles = getAllTypeScriptFiles(srcDir);

    // Verify we have files to test
    expect(allFiles.length).toBeGreaterThan(0);

    const violations: Array<{ file: string; constant: string; line: number }> = [];

    // Files to exclude from constant naming checks (design tokens use camelCase by convention)
    const excludedPatterns = [
      /theme\.ts$/,
      /theme\.config\.ts$/,
      /tokens\.ts$/,
    ];

    allFiles
      .filter((filePath) => !excludedPatterns.some((pattern) => pattern.test(filePath)))
      .forEach((filePath) => {
        const constants = extractGlobalConstants(filePath);

        constants.forEach(({ name, line }) => {
          // Skip PascalCase names - these are React components by convention
          const isPascalCase = /^[A-Z][a-zA-Z0-9]*$/.test(name);
          if (isPascalCase) {
            return;
          }

          if (!isScreamingSnakeCase(name)) {
            violations.push({
              file: path.relative(srcDir, filePath),
              constant: name,
              line,
            });
          }
        });
      });

    if (violations.length > 0) {
      console.log('Constants not using SCREAMING_SNAKE_CASE:');
      violations.forEach((v) => console.log(`  - ${v.file}:${v.line} - ${v.constant}`));
    }

    expect(violations).toEqual([]);
  });

  it('should validate SCREAMING_SNAKE_CASE pattern', () => {
    const validNames = [
      'MAX_CONNECTIONS',
      'API_TIMEOUT',
      'DEFAULT_PORT',
      'ERROR_MESSAGE',
      'TOKEN_LIMIT',
      'MAX_FILE_SIZE',
      'RATE_LIMIT_WINDOW_MS',
    ];

    validNames.forEach((name) => {
      expect(isScreamingSnakeCase(name)).toBe(true);
    });
  });

  it('should reject non-SCREAMING_SNAKE_CASE names', () => {
    const invalidNames = [
      'maxConnections',
      'MaxConnections',
      'max-connections',
      'max_connections',
      'MAX-CONNECTIONS',
    ];

    invalidNames.forEach((name) => {
      expect(isScreamingSnakeCase(name)).toBe(false);
    });
  });
});
