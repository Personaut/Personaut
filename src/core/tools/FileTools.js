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
exports.ListFilesTool = exports.WriteFileTool = exports.ReadFileTool = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const PathValidator_1 = require("../../shared/services/PathValidator");
/**
 * Base class for secure file tools with common validation logic.
 */
class SecureFileTool {
    constructor() {
        this.pathValidator = new PathValidator_1.PathValidator();
    }
    /**
     * Set the secure execution context.
     */
    setContext(context) {
        this.workspaceRoot = context.workspaceRoot;
        this.pathValidator = context.pathValidator;
        this.requestConfirmation = context.requestConfirmation;
    }
    /**
     * Get the workspace root, falling back to VS Code workspace folders.
     */
    getWorkspaceRoot() {
        if (this.workspaceRoot) {
            return this.workspaceRoot;
        }
        const folders = vscode.workspace.workspaceFolders;
        if (folders && folders.length > 0) {
            return folders[0].uri.fsPath;
        }
        throw new Error('No workspace folder is open. File operations require an open workspace.');
    }
}
class ReadFileTool extends SecureFileTool {
    constructor() {
        super(...arguments);
        this.name = 'read_file';
        this.description = 'Read the contents of a file at the specified path within the workspace.';
    }
    getUsageExample() {
        return `<read_file path="/absolute/path/to/file" />`;
    }
    async execute(args) {
        if (!args.path) {
            throw new Error('Missing path argument');
        }
        const workspaceRoot = this.getWorkspaceRoot();
        let targetPath = args.path;
        if (!path.isAbsolute(targetPath)) {
            targetPath = path.join(workspaceRoot, targetPath);
        }
        // Validate path for read operation
        const validation = this.pathValidator.validateForRead(targetPath, workspaceRoot);
        if (!validation.allowed) {
            throw new Error(`File read blocked: ${validation.reason}`);
        }
        // Handle out-of-workspace confirmation
        if (validation.requiresConfirmation) {
            if (this.requestConfirmation) {
                const confirmed = await this.requestConfirmation(`The file "${args.path}" is outside the workspace. Do you want to allow this read operation?`);
                if (!confirmed) {
                    throw new Error('File read cancelled: User denied access to file outside workspace.');
                }
            }
            else {
                throw new Error('File read blocked: Path is outside workspace and no confirmation handler is available.');
            }
        }
        const uri = vscode.Uri.file(validation.normalizedPath || args.path);
        // Check file size before reading
        try {
            const stat = await vscode.workspace.fs.stat(uri);
            const sizeValidation = this.pathValidator.validateFileSize(stat.size);
            if (!sizeValidation.allowed) {
                throw new Error(`File read blocked: ${sizeValidation.reason}`);
            }
        }
        catch (error) {
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
exports.ReadFileTool = ReadFileTool;
class WriteFileTool extends SecureFileTool {
    constructor() {
        super(...arguments);
        this.name = 'write_file';
        this.description = 'Write content to a file at the specified path within the workspace. Overwrites existing content.';
    }
    getUsageExample() {
        return `<write_file path="/absolute/path/to/file">\n    file content here\n</write_file>`;
    }
    async execute(args, content) {
        if (!args.path) {
            throw new Error('Missing path argument');
        }
        const workspaceRoot = this.getWorkspaceRoot();
        let targetPath = args.path;
        if (!path.isAbsolute(targetPath)) {
            targetPath = path.join(workspaceRoot, targetPath);
        }
        // Validate path for write operation
        const validation = this.pathValidator.validateForWrite(targetPath, workspaceRoot);
        if (!validation.allowed) {
            throw new Error(`File write blocked: ${validation.reason}`);
        }
        // Handle out-of-workspace confirmation
        if (validation.requiresConfirmation) {
            if (this.requestConfirmation) {
                const confirmed = await this.requestConfirmation(`The file "${args.path}" is outside the workspace. Do you want to allow this write operation?`);
                if (!confirmed) {
                    throw new Error('File write cancelled: User denied access to file outside workspace.');
                }
            }
            else {
                throw new Error('File write blocked: Path is outside workspace and no confirmation handler is available.');
            }
        }
        // Validate content size before writing
        const contentBytes = new TextEncoder().encode(content || '');
        const sizeValidation = this.pathValidator.validateFileSize(contentBytes.length);
        if (!sizeValidation.allowed) {
            throw new Error(`File write blocked: ${sizeValidation.reason}`);
        }
        const uri = vscode.Uri.file(validation.normalizedPath || args.path);
        await vscode.workspace.fs.writeFile(uri, contentBytes);
        return 'File written successfully.';
    }
}
exports.WriteFileTool = WriteFileTool;
class ListFilesTool extends SecureFileTool {
    constructor() {
        super(...arguments);
        this.name = 'list_files';
        this.description = 'List files and directories in the specified folder within the workspace.';
    }
    getUsageExample() {
        return `<list_files path="/absolute/path/to/directory" />`;
    }
    async execute(args) {
        if (!args.path) {
            throw new Error('Missing path argument');
        }
        const workspaceRoot = this.getWorkspaceRoot();
        let targetPath = args.path;
        if (!path.isAbsolute(targetPath)) {
            targetPath = path.join(workspaceRoot, targetPath);
        }
        // Validate path for list operation (treated as read)
        const validation = this.pathValidator.validatePath(targetPath, workspaceRoot, 'list');
        if (!validation.allowed) {
            throw new Error(`Directory listing blocked: ${validation.reason}`);
        }
        // Handle out-of-workspace confirmation
        if (validation.requiresConfirmation) {
            if (this.requestConfirmation) {
                const confirmed = await this.requestConfirmation(`The directory "${args.path}" is outside the workspace. Do you want to allow this listing operation?`);
                if (!confirmed) {
                    throw new Error('Directory listing cancelled: User denied access to directory outside workspace.');
                }
            }
            else {
                throw new Error('Directory listing blocked: Path is outside workspace and no confirmation handler is available.');
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
exports.ListFilesTool = ListFilesTool;
//# sourceMappingURL=FileTools.js.map