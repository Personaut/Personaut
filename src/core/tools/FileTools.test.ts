import { ReadFileTool, WriteFileTool, ListFilesTool } from './FileTools';
import { PathValidator } from '../../shared/services/PathValidator';
import * as vscode from 'vscode';

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
  let pathValidator: PathValidator;

  beforeEach(() => {
    pathValidator = new PathValidator();
    jest.clearAllMocks();
  });

  describe('ReadFileTool', () => {
    let readFileTool: ReadFileTool;

    beforeEach(() => {
      readFileTool = new ReadFileTool();
      readFileTool.setContext({
        workspaceRoot: '/test/workspace',
        pathValidator,
      });
    });

    it('should read file successfully', async () => {
      const mockContent = 'test content';
      const mockUint8Array = new TextEncoder().encode(mockContent);
      (vscode.workspace.fs.readFile as jest.Mock).mockResolvedValue(mockUint8Array);
      (vscode.workspace.fs.stat as jest.Mock).mockResolvedValue({ size: 100 });

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
    let writeFileTool: WriteFileTool;

    beforeEach(() => {
      writeFileTool = new WriteFileTool();
      writeFileTool.setContext({
        workspaceRoot: '/test/workspace',
        pathValidator,
      });
    });

    it('should write file successfully', async () => {
      (vscode.workspace.fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const result = await writeFileTool.execute(
        { path: '/test/workspace/file.txt' },
        'test content'
      );

      expect(result).toBe('File written successfully.');
      expect(vscode.workspace.fs.writeFile).toHaveBeenCalled();
    });

    it('should reject missing path argument', async () => {
      await expect(writeFileTool.execute({}, 'content')).rejects.toThrow('Missing path argument');
    });
  });

  describe('ListFilesTool', () => {
    let listFilesTool: ListFilesTool;

    beforeEach(() => {
      listFilesTool = new ListFilesTool();
      listFilesTool.setContext({
        workspaceRoot: '/test/workspace',
        pathValidator,
      });
    });

    it('should list files successfully', async () => {
      const mockFiles: [string, vscode.FileType][] = [
        ['file1.txt', vscode.FileType.File],
        ['dir1', vscode.FileType.Directory],
      ];
      (vscode.workspace.fs.readDirectory as jest.Mock).mockResolvedValue(mockFiles);

      const result = await listFilesTool.execute({ path: '/test/workspace' });

      expect(result).toContain('FILE: file1.txt');
      expect(result).toContain('DIR: dir1');
    });

    it('should reject missing path argument', async () => {
      await expect(listFilesTool.execute({})).rejects.toThrow('Missing path argument');
    });
  });
});
