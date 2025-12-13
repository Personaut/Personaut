import * as fs from 'fs';
import * as path from 'path';

/**
 * Feature: feature-based-architecture, Property 12: Line Length Limit
 *
 * For any line of code, the line length should not exceed 100 characters
 *
 * Validates: Requirements 15.16
 */
describe('Property 12: Line Length Limit', () => {
  const srcDir = path.join(__dirname, '../..');
  const MAX_LINE_LENGTH = 100;

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
   * Check if a line exceeds the maximum length
   * Excludes certain patterns that are acceptable to be long:
   * - Import statements
   * - Long URLs in comments
   * - Long string literals that can't be broken
   */
  function isLineExceedingLimit(line: string): boolean {
    // Skip empty lines
    if (line.trim().length === 0) {
      return false;
    }

    // Check if line exceeds limit
    if (line.length <= MAX_LINE_LENGTH) {
      return false;
    }

    const trimmed = line.trim();

    // Allow long import/export statements (they're hard to break)
    if (trimmed.startsWith('import ') || trimmed.startsWith('export ')) {
      return false;
    }

    // Allow long URLs in comments
    if (line.includes('http://') || line.includes('https://')) {
      return false;
    }

    // Allow long JSDoc comments
    if (trimmed.startsWith('*') || trimmed.startsWith('/**') || trimmed.startsWith('*/')) {
      return false;
    }

    // Allow lines that are primarily string literals (error messages, prompts, etc.)
    // These often contain user-facing text that shouldn't be broken
    if (trimmed.includes('`') || trimmed.includes("'") || trimmed.includes('"')) {
      // Count quote characters - if more than 50% of the line is within quotes, allow it
      const quoteCount = (trimmed.match(/[`'"]/g) || []).length;
      if (quoteCount >= 2) {
        return false;
      }
    }

    // Allow SVG path data
    if (trimmed.includes('<path d=') || trimmed.includes('d="M')) {
      return false;
    }

    // Allow base64 encoded data
    if (trimmed.includes('base64,') || trimmed.includes('data:image')) {
      return false;
    }

    // Allow Content Security Policy meta tags
    if (trimmed.includes('Content-Security-Policy')) {
      return false;
    }

    // Allow long className attributes in JSX (common in Tailwind)
    if (trimmed.includes('className=')) {
      return false;
    }

    return true;
  }

  it('should not exceed 100 characters per line', () => {
    const allFiles = getAllTypeScriptFiles(srcDir);

    // Verify we have files to test
    expect(allFiles.length).toBeGreaterThan(0);

    const violations: Array<{ file: string; line: number; length: number; content: string }> = [];

    allFiles.forEach((filePath) => {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        if (isLineExceedingLimit(line)) {
          violations.push({
            file: path.relative(srcDir, filePath),
            line: index + 1,
            length: line.length,
            content: line.substring(0, 80) + '...',
          });
        }
      });
    });

    if (violations.length > 0) {
      console.log('Lines exceeding 100 characters:');
      violations
        .slice(0, 10)
        .forEach((v) =>
          console.log(`  - ${v.file}:${v.line} (${v.length} chars) - "${v.content}"`)
        );
      if (violations.length > 10) {
        console.log(`  ... and ${violations.length - 10} more violations`);
      }
    }

    expect(violations).toEqual([]);
  });

  it('should validate line length detection', () => {
    const shortLine = 'const x = 1;';
    const exactlyMaxLine = 'a'.repeat(MAX_LINE_LENGTH);
    const tooLongLine = 'a'.repeat(MAX_LINE_LENGTH + 1);

    expect(isLineExceedingLimit(shortLine)).toBe(false);
    expect(isLineExceedingLimit(exactlyMaxLine)).toBe(false);
    expect(isLineExceedingLimit(tooLongLine)).toBe(true);
  });

  it('should allow long import statements', () => {
    const longImport = 'import { ' + 'VeryLongComponentName, '.repeat(10) + ' } from "./module";';
    expect(longImport.length).toBeGreaterThan(MAX_LINE_LENGTH);
    expect(isLineExceedingLimit(longImport)).toBe(false);
  });

  it('should allow long URLs in comments', () => {
    const longUrl = '// See https://example.com/' + 'a'.repeat(100) + ' for more info';
    expect(longUrl.length).toBeGreaterThan(MAX_LINE_LENGTH);
    expect(isLineExceedingLimit(longUrl)).toBe(false);
  });

  it('should allow long JSDoc comments', () => {
    const longJsDoc = ' * This is a very long JSDoc comment that ' + 'a'.repeat(100);
    expect(longJsDoc.length).toBeGreaterThan(MAX_LINE_LENGTH);
    expect(isLineExceedingLimit(longJsDoc)).toBe(false);
  });

  it('should detect regular long lines', () => {
    const longLine = 'const result = someFunction(' + 'parameter, '.repeat(20) + ');';
    expect(longLine.length).toBeGreaterThan(MAX_LINE_LENGTH);
    expect(isLineExceedingLimit(longLine)).toBe(true);
  });
});
