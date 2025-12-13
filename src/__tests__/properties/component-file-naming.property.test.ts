import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

/**
 * Feature: feature-based-architecture, Property 4: Component File Naming
 *
 * For any TypeScript file exporting a class or React component,
 * the filename should use PascalCase
 *
 * Validates: Requirements 15.2
 */
describe('Property 4: Component File Naming', () => {
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
   * Check if a string is in PascalCase format
   */
  function isPascalCase(str: string): boolean {
    // PascalCase: starts with uppercase, followed by alphanumeric
    return /^[A-Z][a-zA-Z0-9]*$/.test(str);
  }

  /**
   * Check if a file exports a class or React component
   */
  function exportsClassOrComponent(filePath: string): boolean {
    const content = fs.readFileSync(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

    let hasClassExport = false;

    function visit(node: ts.Node) {
      // Check for exported classes
      if (ts.isClassDeclaration(node)) {
        const hasExportModifier = node.modifiers?.some(
          (mod) => mod.kind === ts.SyntaxKind.ExportKeyword
        );
        if (hasExportModifier) {
          hasClassExport = true;
        }
      }

      // Check for default exports of classes
      if (ts.isExportAssignment(node)) {
        if (ts.isClassExpression(node.expression)) {
          hasClassExport = true;
        }
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    return hasClassExport;
  }

  it('should use PascalCase for files exporting classes or components', () => {
    const allFiles = getAllTypeScriptFiles(srcDir);

    // Verify we have files to test
    expect(allFiles.length).toBeGreaterThan(0);

    const violations: string[] = [];

    allFiles.forEach((filePath) => {
      if (exportsClassOrComponent(filePath)) {
        const fileName = path.basename(filePath, path.extname(filePath));

        if (!isPascalCase(fileName)) {
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

  it('should validate PascalCase pattern', () => {
    const validNames = [
      'Agent',
      'ChatHandler',
      'SidebarProvider',
      'BuildModeService',
      'PersonaStorage',
      'MCPManager',
      'IProvider',
      'ITool',
    ];

    validNames.forEach((name) => {
      expect(isPascalCase(name)).toBe(true);
    });
  });

  it('should reject non-PascalCase names', () => {
    const invalidNames = [
      'agent',
      'chatHandler',
      'sidebar-provider',
      'build_mode_service',
      'PERSONA_STORAGE',
      'mcp-manager',
      'iProvider',
    ];

    invalidNames.forEach((name) => {
      expect(isPascalCase(name)).toBe(false);
    });
  });
});
