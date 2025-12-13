"use strict";
/**
 * Unit tests for PathValidator
 *
 * Feature: feature-based-architecture
 * Validates: Requirements 8.4
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const PathValidator_1 = require("./PathValidator");
const path = __importStar(require("path"));
describe('PathValidator', () => {
    let validator;
    const workspaceRoot = '/home/user/workspace';
    beforeEach(() => {
        validator = new PathValidator_1.PathValidator();
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
            const validatorWithOutside = new PathValidator_1.PathValidator({ allowOutOfWorkspace: true });
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
//# sourceMappingURL=PathValidator.test.js.map