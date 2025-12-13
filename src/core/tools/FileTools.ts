import * as vscode from 'vscode';
import * as path from 'path';
import { ITool } from './ITool';
import {
  PathValidator,
  PathValidationResult,
  FileSizeValidationResult,
} from '../../shared/services/PathValidator';

/**
 * Secure execution context for file tools.
 * Provides workspace root and security services.
 */
export interface SecureFileToolContext {
  workspaceRoot: string;
  pathValidator: PathValidator;
  requestConfirmation?: (message: string) => Promise<boolean>;
}

/**
 * Base class for secure file tools with common validation logic.
 */
abstract class SecureFileTool implements ITool {
  abstract name: string;
  abstract description: string;

  protected pathValidator: PathValidator;
  protected workspaceRoot: string | undefined;
  protected requestConfirmation?: (message: string) => Promise<boolean>;

  constructor() {
    this.pathValidator = new PathValidator();
  }

  /**
   * Set the secure execution context.
   */
  setContext(context: SecureFileToolContext): void {
    this.workspaceRoot = context.workspaceRoot;
    this.pathValidator = context.pathValidator;
    this.requestConfirmation = context.requestConfirmation;
  }

  /**
   * Get the workspace root, falling back to VS Code workspace folders.
   */
  protected getWorkspaceRoot(): string {
    if (this.workspaceRoot) {
      return this.workspaceRoot;
    }

    const folders = vscode.workspace.workspaceFolders;
    if (folders && folders.length > 0) {
      return folders[0].uri.fsPath;
    }

    throw new Error('No workspace folder is open. File operations require an open workspace.');
  }

  abstract getUsageExample(): string;
  abstract execute(args: any, content?: string): Promise<string>;
}

export class ReadFileTool extends SecureFileTool {
  name = 'read_file';
  description = 'Read the contents of a file at the specified path within the workspace.';

  getUsageExample(): string {
    return `<read_file path="/absolute/path/to/file" />`;
  }

  async execute(args: any): Promise<string> {
    if (!args.path) {
      throw new Error('Missing path argument');
    }

    const workspaceRoot = this.getWorkspaceRoot();
    let targetPath = args.path;
    if (!path.isAbsolute(targetPath)) {
      targetPath = path.join(workspaceRoot, targetPath);
    }

    // Validate path for read operation
    const validation: PathValidationResult = this.pathValidator.validateForRead(
      targetPath,
      workspaceRoot
    );

    if (!validation.allowed) {
      throw new Error(`File read blocked: ${validation.reason}`);
    }

    // Handle out-of-workspace confirmation
    if (validation.requiresConfirmation) {
      if (this.requestConfirmation) {
        const confirmed = await this.requestConfirmation(
          `The file "${args.path}" is outside the workspace. Do you want to allow this read operation?`
        );
        if (!confirmed) {
          throw new Error('File read cancelled: User denied access to file outside workspace.');
        }
      } else {
        throw new Error(
          'File read blocked: Path is outside workspace and no confirmation handler is available.'
        );
      }
    }

    const uri = vscode.Uri.file(validation.normalizedPath || args.path);

    // Check file size before reading
    try {
      const stat = await vscode.workspace.fs.stat(uri);
      const sizeValidation: FileSizeValidationResult = this.pathValidator.validateFileSize(
        stat.size
      );

      if (!sizeValidation.allowed) {
        throw new Error(`File read blocked: ${sizeValidation.reason}`);
      }
    } catch (error: any) {
      if (error.code === 'FileNotFound' || error.message?.includes('ENOENT')) {
        throw new Error(`File not found: ${args.path}`);
      }
      // Re-throw size validation errors
      if (error.message?.includes('File read blocked')) {
        throw error;
      }
      // For other stat errors, proceed with read attempt
    }

    const uint8Array = await vscode.workspace.fs.readFile(uri);
    return new TextDecoder().decode(uint8Array);
  }
}

export class WriteFileTool extends SecureFileTool {
  name = 'write_file';
  description =
    'Write content to a file at the specified path within the workspace. Overwrites existing content.';

  getUsageExample(): string {
    return `<write_file path="/absolute/path/to/file">\n    file content here\n</write_file>`;
  }

  async execute(args: any, content?: string): Promise<string> {
    if (!args.path) {
      throw new Error('Missing path argument');
    }

    const workspaceRoot = this.getWorkspaceRoot();
    let targetPath = args.path;
    if (!path.isAbsolute(targetPath)) {
      targetPath = path.join(workspaceRoot, targetPath);
    }

    // Validate path for write operation
    const validation: PathValidationResult = this.pathValidator.validateForWrite(
      targetPath,
      workspaceRoot
    );

    if (!validation.allowed) {
      throw new Error(`File write blocked: ${validation.reason}`);
    }

    // Handle out-of-workspace confirmation
    if (validation.requiresConfirmation) {
      if (this.requestConfirmation) {
        const confirmed = await this.requestConfirmation(
          `The file "${args.path}" is outside the workspace. Do you want to allow this write operation?`
        );
        if (!confirmed) {
          throw new Error('File write cancelled: User denied access to file outside workspace.');
        }
      } else {
        throw new Error(
          'File write blocked: Path is outside workspace and no confirmation handler is available.'
        );
      }
    }

    // Validate content size before writing
    const contentBytes = new TextEncoder().encode(content || '');
    const sizeValidation: FileSizeValidationResult = this.pathValidator.validateFileSize(
      contentBytes.length
    );

    if (!sizeValidation.allowed) {
      throw new Error(`File write blocked: ${sizeValidation.reason}`);
    }

    const uri = vscode.Uri.file(validation.normalizedPath || args.path);
    await vscode.workspace.fs.writeFile(uri, contentBytes);
    return 'File written successfully.';
  }
}

export class ListFilesTool extends SecureFileTool {
  name = 'list_files';
  description = 'List files and directories in the specified folder within the workspace.';

  getUsageExample(): string {
    return `<list_files path="/absolute/path/to/directory" />`;
  }

  async execute(args: any): Promise<string> {
    if (!args.path) {
      throw new Error('Missing path argument');
    }

    const workspaceRoot = this.getWorkspaceRoot();
    let targetPath = args.path;
    if (!path.isAbsolute(targetPath)) {
      targetPath = path.join(workspaceRoot, targetPath);
    }

    // Validate path for list operation (treated as read)
    const validation: PathValidationResult = this.pathValidator.validatePath(
      targetPath,
      workspaceRoot,
      'list'
    );

    if (!validation.allowed) {
      throw new Error(`Directory listing blocked: ${validation.reason}`);
    }

    // Handle out-of-workspace confirmation
    if (validation.requiresConfirmation) {
      if (this.requestConfirmation) {
        const confirmed = await this.requestConfirmation(
          `The directory "${args.path}" is outside the workspace. Do you want to allow this listing operation?`
        );
        if (!confirmed) {
          throw new Error(
            'Directory listing cancelled: User denied access to directory outside workspace.'
          );
        }
      } else {
        throw new Error(
          'Directory listing blocked: Path is outside workspace and no confirmation handler is available.'
        );
      }
    }

    const uri = vscode.Uri.file(validation.normalizedPath || args.path);
    const files = await vscode.workspace.fs.readDirectory(uri);
    return files
      .map(([name, type]) => {
        const typeStr = type === vscode.FileType.Directory ? 'DIR' : 'FILE';
        return `${typeStr}: ${name}`;
      })
      .join('\n');
  }
}
