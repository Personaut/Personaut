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
const FileTools_1 = require("./FileTools");
const PathValidator_1 = require("../../shared/services/PathValidator");
const vscode = __importStar(require("vscode"));
// Mock vscode
jest.mock('vscode', () => ({
    workspace: {
        workspaceFolders: [
            {
                uri: {
                    fsPath: '/test/workspace',
                },
            },
        ],
        fs: {
            readFile: jest.fn(),
            writeFile: jest.fn(),
            readDirectory: jest.fn(),
            stat: jest.fn(),
        },
    },
    Uri: {
        file: jest.fn((path) => ({ fsPath: path })),
    },
    FileType: {
        Directory: 2,
        File: 1,
    },
}));
describe('FileTools', () => {
    let pathValidator;
    beforeEach(() => {
        pathValidator = new PathValidator_1.PathValidator();
        jest.clearAllMocks();
    });
    describe('ReadFileTool', () => {
        let readFileTool;
        beforeEach(() => {
            readFileTool = new FileTools_1.ReadFileTool();
            readFileTool.setContext({
                workspaceRoot: '/test/workspace',
                pathValidator,
            });
        });
        it('should read file successfully', async () => {
            const mockContent = 'test content';
            const mockUint8Array = new TextEncoder().encode(mockContent);
            vscode.workspace.fs.readFile.mockResolvedValue(mockUint8Array);
            vscode.workspace.fs.stat.mockResolvedValue({ size: 100 });
            const result = await readFileTool.execute({ path: '/test/workspace/file.txt' });
            expect(result).toBe(mockContent);
        });
        it('should reject empty path', async () => {
            await expect(readFileTool.execute({ path: '' })).rejects.toThrow();
        });
        it('should reject missing path argument', async () => {
            await expect(readFileTool.execute({})).rejects.toThrow('Missing path argument');
        });
    });
    describe('WriteFileTool', () => {
        let writeFileTool;
        beforeEach(() => {
            writeFileTool = new FileTools_1.WriteFileTool();
            writeFileTool.setContext({
                workspaceRoot: '/test/workspace',
                pathValidator,
            });
        });
        it('should write file successfully', async () => {
            vscode.workspace.fs.writeFile.mockResolvedValue(undefined);
            const result = await writeFileTool.execute({ path: '/test/workspace/file.txt' }, 'test content');
            expect(result).toBe('File written successfully.');
            expect(vscode.workspace.fs.writeFile).toHaveBeenCalled();
        });
        it('should reject missing path argument', async () => {
            await expect(writeFileTool.execute({}, 'content')).rejects.toThrow('Missing path argument');
        });
    });
    describe('ListFilesTool', () => {
        let listFilesTool;
        beforeEach(() => {
            listFilesTool = new FileTools_1.ListFilesTool();
            listFilesTool.setContext({
                workspaceRoot: '/test/workspace',
                pathValidator,
            });
        });
        it('should list files successfully', async () => {
            const mockFiles = [
                ['file1.txt', vscode.FileType.File],
                ['dir1', vscode.FileType.Directory],
            ];
            vscode.workspace.fs.readDirectory.mockResolvedValue(mockFiles);
            const result = await listFilesTool.execute({ path: '/test/workspace' });
            expect(result).toContain('FILE: file1.txt');
            expect(result).toContain('DIR: dir1');
        });
        it('should reject missing path argument', async () => {
            await expect(listFilesTool.execute({})).rejects.toThrow('Missing path argument');
        });
    });
});
//# sourceMappingURL=FileTools.test.js.map