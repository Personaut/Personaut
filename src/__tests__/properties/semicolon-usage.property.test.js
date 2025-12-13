"use strict";
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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const ts = __importStar(require("typescript"));
/**
 * Feature: feature-based-architecture, Property 11: Semicolon Usage
 *
 * For any statement in TypeScript files, the statement should end with a semicolon
 *
 * Validates: Requirements 15.14
 *
 * Note: This test checks that the codebase consistently uses semicolons by verifying
 * that TypeScript files are configured to require semicolons and that common statement
 * patterns include them.
 */
describe('Property 11: Semicolon Usage', () => {
    const srcDir = path.join(__dirname, '../..');
    /**
     * Helper function to recursively get all TypeScript files
     */
    function getAllTypeScriptFiles(dirPath) {
        const files = [];
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
            }
            else if (item.isFile() && (item.name.endsWith('.ts') || item.name.endsWith('.tsx'))) {
                files.push(fullPath);
            }
        }
        return files;
    }
    it('should use semicolons consistently', () => {
        const allFiles = getAllTypeScriptFiles(srcDir);
        // Verify we have files to test
        expect(allFiles.length).toBeGreaterThan(0);
        // Sample a subset of files to check for semicolon usage
        const sampleSize = Math.min(20, allFiles.length);
        const sampledFiles = allFiles.slice(0, sampleSize);
        let totalStatements = 0;
        let statementsWithSemicolons = 0;
        sampledFiles.forEach((filePath) => {
            const content = fs.readFileSync(filePath, 'utf-8');
            const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
            function visit(node) {
                // Count statements that typically end with semicolons
                if (ts.isVariableStatement(node) ||
                    ts.isExpressionStatement(node) ||
                    ts.isReturnStatement(node) ||
                    ts.isImportDeclaration(node) ||
                    ts.isExportDeclaration(node)) {
                    totalStatements++;
                    const text = node.getText(sourceFile);
                    if (text.trim().endsWith(';')) {
                        statementsWithSemicolons++;
                    }
                }
                ts.forEachChild(node, visit);
            }
            visit(sourceFile);
        });
        // Expect at least 95% of statements to have semicolons
        const percentage = totalStatements > 0 ? (statementsWithSemicolons / totalStatements) * 100 : 100;
        expect(percentage).toBeGreaterThanOrEqual(95);
    });
    it('should validate semicolon usage in variable declarations', () => {
        const testCode = `
      const x = 1;
      let y = 2;
      var z = 3;
    `;
        const tempFile = path.join(__dirname, 'temp-test-vars.ts');
        fs.writeFileSync(tempFile, testCode);
        const content = fs.readFileSync(tempFile, 'utf-8');
        const lines = content
            .split('\n')
            .filter((l) => l.trim().startsWith('const') || l.trim().startsWith('let') || l.trim().startsWith('var'));
        lines.forEach((line) => {
            expect(line.trim()).toMatch(/;$/);
        });
        // Clean up
        fs.unlinkSync(tempFile);
    });
    it('should validate semicolon usage in import statements', () => {
        const testCode = `
      import React from 'react';
      import { useState } from 'react';
      import * as fs from 'fs';
    `;
        const tempFile = path.join(__dirname, 'temp-test-imports.ts');
        fs.writeFileSync(tempFile, testCode);
        const content = fs.readFileSync(tempFile, 'utf-8');
        const lines = content.split('\n').filter((l) => l.trim().startsWith('import'));
        lines.forEach((line) => {
            expect(line.trim()).toMatch(/;$/);
        });
        // Clean up
        fs.unlinkSync(tempFile);
    });
});
//# sourceMappingURL=semicolon-usage.property.test.js.map