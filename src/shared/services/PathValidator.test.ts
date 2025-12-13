/**
 * Unit tests for PathValidator
 *
 * Feature: feature-based-architecture
 * Validates: Requirements 8.4
 */

import { PathValidator } from './PathValidator';
import * as path from 'path';

describe('PathValidator', () => {
  let validator: PathValidator;
  const workspaceRoot = '/home/user/workspace';

  beforeEach(() => {
    validator = new PathValidator();
  });

  describe('validatePath', () => {
    it('should accept valid paths within workspace', () => {
      const targetPath = path.join(workspaceRoot, 'src/index.ts');
      const result = validator.validatePath(targetPath, workspaceRoot);

      expect(result.allowed).toBe(true);
    });

    it('should reject empty paths', () => {
      const result = validator.validatePath('', workspaceRoot);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Empty path');
    });

    it('should reject paths without workspace root', () => {
      const result = validator.validatePath('src/index.ts', '');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('workspace root');
    });

    it('should reject paths outside workspace when not allowed', () => {
      const result = validator.validatePath('/home/user/other/file.txt', workspaceRoot);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('outside');
    });

    it('should require confirmation for paths outside workspace when allowed', () => {
      const validatorWithOutside = new PathValidator({ allowOutOfWorkspace: true });
      const result = validatorWithOutside.validatePath('/home/user/other/file.txt', workspaceRoot);

      expect(result.allowed).toBe(true);
      expect(result.requiresConfirmation).toBe(true);
    });
  });

  describe('validateForRead', () => {
    it('should validate read operations', () => {
      const targetPath = path.join(workspaceRoot, 'src/index.ts');
      const result = validator.validateForRead(targetPath, workspaceRoot);

      expect(result.allowed).toBe(true);
    });
  });

  describe('validateForWrite', () => {
    it('should validate write operations', () => {
      const targetPath = path.join(workspaceRoot, 'src/index.ts');
      const result = validator.validateForWrite(targetPath, workspaceRoot);

      expect(result.allowed).toBe(true);
    });
  });
});
