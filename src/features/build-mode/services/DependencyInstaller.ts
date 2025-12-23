/**
 * DependencyInstaller - Handles npm dependency installation for generated projects
 *
 * Responsibilities:
 * - Run npm install in project directory
 * - Handle installation errors gracefully
 * - Show progress to user via callbacks
 * - Support cancellation during install
 *
 * Validates: Build Mode Requirements - Project Initialization
 */

import { spawn, ChildProcess } from 'child_process';

export interface InstallOptions {
    projectPath: string;
    onProgress?: (message: string) => void;
    onError?: (error: string) => void;
    timeout?: number; // milliseconds, default 300000 (5 minutes)
}

export interface InstallResult {
    success: boolean;
    duration: number; // milliseconds
    error?: string;
}

export class DependencyInstaller {
    private activeProcess: ChildProcess | null = null;
    private isCancelled: boolean = false;

    /**
     * Install npm dependencies in the specified project directory
     */
    async install(options: InstallOptions): Promise<InstallResult> {
        const { projectPath, onProgress, onError, timeout = 300000 } = options;
        const startTime = Date.now();

        this.isCancelled = false;

        try {
            onProgress?.('Installing dependencies...');

            // Run npm install
            const result = await this.runNpmInstall(projectPath, onProgress, onError, timeout);

            const duration = Date.now() - startTime;

            if (this.isCancelled) {
                return {
                    success: false,
                    duration,
                    error: 'Installation cancelled by user',
                };
            }

            if (result.success) {
                onProgress?.('Dependencies installed successfully');
                return {
                    success: true,
                    duration,
                };
            } else {
                onError?.(result.error || 'Installation failed');
                return {
                    success: false,
                    duration,
                    error: result.error,
                };
            }
        } catch (error: any) {
            const duration = Date.now() - startTime;
            const errorMessage = error.message || 'Unknown installation error';
            onError?.(errorMessage);

            return {
                success: false,
                duration,
                error: errorMessage,
            };
        } finally {
            this.cleanup();
        }
    }

    /**
     * Cancel the current installation
     */
    cancel(): void {
        this.isCancelled = true;
        if (this.activeProcess) {
            this.activeProcess.kill('SIGTERM');
        }
    }

    /**
     * Run npm install command
     */
    private runNpmInstall(
        projectPath: string,
        onProgress?: (message: string) => void,
        onError?: (error: string) => void,
        timeout: number = 300000
    ): Promise<{ success: boolean; error?: string }> {
        return new Promise((resolve, reject) => {
            // Check if cancelled before starting
            if (this.isCancelled) {
                resolve({ success: false, error: 'Cancelled before start' });
                return;
            }

            // Spawn npm install process with --legacy-peer-deps to handle peer dependency conflicts
            this.activeProcess = spawn('npm', ['install', '--legacy-peer-deps'], {
                cwd: projectPath,
                shell: true,
            });

            let stdout = '';
            let stderr = '';

            // Capture stdout
            this.activeProcess.stdout?.on('data', (data: Buffer) => {
                const message = data.toString();
                stdout += message;
                onProgress?.(message.trim());
            });

            // Capture stderr
            this.activeProcess.stderr?.on('data', (data: Buffer) => {
                const message = data.toString();
                stderr += message;
                // npm writes progress to stderr, so only treat it as error if it looks like one
                if (message.toLowerCase().includes('error') || message.toLowerCase().includes('failed')) {
                    onError?.(message.trim());
                }
            });

            // Handle process completion
            this.activeProcess.on('close', (code: number | null) => {
                if (this.isCancelled) {
                    resolve({ success: false, error: 'Installation cancelled' });
                    return;
                }

                if (code === 0) {
                    resolve({ success: true });
                } else {
                    const errorMessage = stderr || `npm install exited with code ${code}`;
                    resolve({ success: false, error: errorMessage });
                }
            });

            // Handle process errors
            this.activeProcess.on('error', (error: Error) => {
                if (this.isCancelled) {
                    resolve({ success: false, error: 'Installation cancelled' });
                    return;
                }

                reject(error);
            });

            // Set timeout
            const timeoutId = setTimeout(() => {
                if (this.activeProcess && !this.isCancelled) {
                    this.activeProcess.kill('SIGTERM');
                    resolve({
                        success: false,
                        error: `Installation timed out after ${timeout / 1000} seconds`,
                    });
                }
            }, timeout);

            // Clear timeout on completion
            this.activeProcess.on('close', () => {
                clearTimeout(timeoutId);
            });
        });
    }

    /**
     * Cleanup resources
     */
    private cleanup(): void {
        if (this.activeProcess) {
            this.activeProcess.removeAllListeners();
            this.activeProcess = null;
        }
    }
}
