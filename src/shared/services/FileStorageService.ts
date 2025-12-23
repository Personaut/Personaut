/**
 * FileStorageService - File-based storage for VS Code extensions
 * 
 * Provides reliable file storage using context.globalStorageUri.
 * Replaces globalState for large data to avoid size limits.
 * 
 * Features:
 * - Atomic writes (temp file + rename)
 * - Automatic directory creation
 * - JSON serialization
 * - Error handling with graceful fallbacks
 * 
 * @module shared/services/FileStorageService
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface FileStorageOptions {
    /** Enable atomic writes using temp files */
    atomicWrites?: boolean;
    /** Pretty print JSON with indentation */
    prettyPrint?: boolean;
}

const DEFAULT_OPTIONS: FileStorageOptions = {
    atomicWrites: true,
    prettyPrint: true,
};

/**
 * File-based storage service for VS Code extensions
 */
export class FileStorageService {
    private options: FileStorageOptions;

    /**
     * Create a new FileStorageService
     * @param baseDir - Base directory for all storage (typically context.globalStorageUri.fsPath)
     * @param options - Configuration options
     */
    constructor(
        private baseDir: string,
        options: FileStorageOptions = {}
    ) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
    }

    /**
     * Get the full absolute path for a relative path
     */
    getFullPath(relativePath: string): string {
        return path.join(this.baseDir, relativePath);
    }

    /**
     * Check if a file or directory exists
     */
    async exists(relativePath: string): Promise<boolean> {
        const fullPath = this.getFullPath(relativePath);
        try {
            await fs.promises.access(fullPath, fs.constants.F_OK);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Ensure a directory exists, creating it if necessary
     */
    async ensureDirectory(relativePath: string): Promise<void> {
        const fullPath = this.getFullPath(relativePath);
        try {
            await fs.promises.mkdir(fullPath, { recursive: true });
        } catch (error: any) {
            // Ignore EEXIST errors
            if (error.code !== 'EEXIST') {
                throw error;
            }
        }
    }

    /**
     * Read a JSON file
     * @returns Parsed data or null if file doesn't exist or is invalid
     */
    async read<T>(relativePath: string): Promise<T | null> {
        const fullPath = this.getFullPath(relativePath);
        try {
            const content = await fs.promises.readFile(fullPath, 'utf-8');
            return JSON.parse(content) as T;
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                // File doesn't exist - return null silently
                return null;
            }
            if (error instanceof SyntaxError) {
                // Invalid JSON - log and return null
                console.error(`[FileStorageService] Invalid JSON in ${relativePath}:`, error.message);
                return null;
            }
            // Other errors - log and return null
            console.error(`[FileStorageService] Error reading ${relativePath}:`, error.message);
            return null;
        }
    }

    /**
     * Write data to a JSON file
     * Uses atomic writes by default (write to temp, then rename)
     */
    async write<T>(relativePath: string, data: T): Promise<void> {
        const fullPath = this.getFullPath(relativePath);

        // Ensure directory exists
        await this.ensureDirectory(path.dirname(relativePath));

        // Serialize data
        const content = this.options.prettyPrint
            ? JSON.stringify(data, null, 2)
            : JSON.stringify(data);

        if (this.options.atomicWrites) {
            // Atomic write: write to temp file, then rename
            const tempPath = `${fullPath}.${crypto.randomBytes(6).toString('hex')}.tmp`;
            try {
                await fs.promises.writeFile(tempPath, content, 'utf-8');
                await fs.promises.rename(tempPath, fullPath);
            } catch (error) {
                // Clean up temp file if rename failed
                try {
                    await fs.promises.unlink(tempPath);
                } catch {
                    // Ignore cleanup errors
                }
                throw error;
            }
        } else {
            // Direct write
            await fs.promises.writeFile(fullPath, content, 'utf-8');
        }
    }

    /**
     * Read a plain text file
     * @returns File content as string or null if file doesn't exist
     */
    async readText(relativePath: string): Promise<string | null> {
        const fullPath = this.getFullPath(relativePath);
        try {
            return await fs.promises.readFile(fullPath, 'utf-8');
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                return null;
            }
            console.error(`[FileStorageService] Error reading text file ${relativePath}:`, error.message);
            return null;
        }
    }

    /**
     * Write plain text to a file
     */
    async writeText(relativePath: string, content: string): Promise<void> {
        const fullPath = this.getFullPath(relativePath);

        // Ensure directory exists
        await this.ensureDirectory(path.dirname(relativePath));

        await fs.promises.writeFile(fullPath, content, 'utf-8');
    }

    /**
     * Read a base64-encoded file
     * @returns Base64 string or null if file doesn't exist
     */
    async readBase64(relativePath: string): Promise<string | null> {
        const fullPath = this.getFullPath(relativePath);
        try {
            const buffer = await fs.promises.readFile(fullPath);
            return buffer.toString('base64');
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                return null;
            }
            console.error(`[FileStorageService] Error reading base64 file ${relativePath}:`, error.message);
            return null;
        }
    }

    /**
     * Write base64-encoded data to a file
     */
    async writeBase64(relativePath: string, base64Data: string): Promise<void> {
        const fullPath = this.getFullPath(relativePath);

        // Ensure directory exists
        await this.ensureDirectory(path.dirname(relativePath));

        const buffer = Buffer.from(base64Data, 'base64');
        await fs.promises.writeFile(fullPath, buffer);
    }


    /**
     * Delete a file
     * @returns true if file was deleted, false if it didn't exist
     */
    async delete(relativePath: string): Promise<boolean> {
        const fullPath = this.getFullPath(relativePath);
        try {
            await fs.promises.unlink(fullPath);
            return true;
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                return false;
            }
            throw error;
        }
    }

    /**
     * Delete a directory and all its contents
     * @returns true if directory was deleted, false if it didn't exist
     */
    async deleteDirectory(relativePath: string): Promise<boolean> {
        const fullPath = this.getFullPath(relativePath);
        try {
            await fs.promises.rm(fullPath, { recursive: true, force: true });
            return true;
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                return false;
            }
            throw error;
        }
    }

    /**
     * List files and directories in a directory
     * @returns Array of entry names, or empty array if directory doesn't exist
     */
    async list(directoryPath: string): Promise<string[]> {
        const fullPath = this.getFullPath(directoryPath);
        try {
            const entries = await fs.promises.readdir(fullPath);
            return entries;
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                return [];
            }
            throw error;
        }
    }

    /**
     * List files and directories with type information
     * @returns Array of entries with name and isDirectory flag
     */
    async listWithTypes(directoryPath: string): Promise<Array<{ name: string; isDirectory: boolean }>> {
        const fullPath = this.getFullPath(directoryPath);
        try {
            const entries = await fs.promises.readdir(fullPath, { withFileTypes: true });
            return entries.map(entry => ({
                name: entry.name,
                isDirectory: entry.isDirectory(),
            }));
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                return [];
            }
            throw error;
        }
    }

    /**
     * Get file statistics
     * @returns Stats object or null if file doesn't exist
     */
    async stat(relativePath: string): Promise<fs.Stats | null> {
        const fullPath = this.getFullPath(relativePath);
        try {
            return await fs.promises.stat(fullPath);
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                return null;
            }
            throw error;
        }
    }

    /**
     * Copy a file
     */
    async copy(sourcePath: string, destPath: string): Promise<void> {
        const sourceFullPath = this.getFullPath(sourcePath);
        const destFullPath = this.getFullPath(destPath);

        // Ensure destination directory exists
        await this.ensureDirectory(path.dirname(destPath));

        await fs.promises.copyFile(sourceFullPath, destFullPath);
    }

    /**
     * Move a file (rename)
     */
    async move(sourcePath: string, destPath: string): Promise<void> {
        const sourceFullPath = this.getFullPath(sourcePath);
        const destFullPath = this.getFullPath(destPath);

        // Ensure destination directory exists
        await this.ensureDirectory(path.dirname(destPath));

        await fs.promises.rename(sourceFullPath, destFullPath);
    }

    /**
     * Get the base directory path
     */
    getBaseDir(): string {
        return this.baseDir;
    }
}

/**
 * Create a FileStorageService from a VS Code context
 */
export function createFileStorageService(
    globalStorageUri: { fsPath: string },
    options?: FileStorageOptions
): FileStorageService {
    return new FileStorageService(globalStorageUri.fsPath, options);
}
