/**
 * DevServerManager - Manages development server lifecycle
 *
 * Responsibilities:
 * - Start dev server with appropriate command for framework
 * - Wait for server to be ready (port checking)
 * - Handle server startup failures
 * - Store server process for cleanup
 * - Kill server on cancellation or completion
 *
 * Validates: Build Mode Requirements - Dev Server Management
 */

import { spawn, ChildProcess } from 'child_process';

export interface DevServerOptions {
    projectPath: string;
    framework: 'react' | 'nextjs' | 'vue' | 'flutter' | 'html';
    port?: number; // default 3000
    onLog?: (message: string) => void;
    onError?: (error: string) => void;
    onReady?: () => void;
    timeout?: number; // milliseconds, default 60000 (1 minute)
}

export interface DevServerResult {
    success: boolean;
    port: number;
    process?: ChildProcess;
    error?: string;
}

export class DevServerManager {
    private activeServer: ChildProcess | null = null;
    private compilationOutput: string = '';

    /**
     * Start the development server
     */
    async start(options: DevServerOptions): Promise<DevServerResult> {
        const {
            projectPath,
            framework,
            port = 3000,
            onLog,
            onError,
            onReady,
            timeout = 60000,
        } = options;

        try {
            onLog?.(`Starting ${framework} development server on port ${port}...`);

            // Get the appropriate command for the framework
            const command = this.getDevCommand(framework);

            // Start the server process
            this.activeServer = spawn(command.cmd, command.args, {
                cwd: projectPath,
                shell: true,
                env: {
                    ...process.env,
                    PORT: port.toString(),
                    BROWSER: 'none', // Don't auto-open browser
                },
            });

            // Capture output
            this.activeServer.stdout?.on('data', (data: Buffer) => {
                const message = data.toString();
                this.compilationOutput += message;
                onLog?.(message.trim());
            });

            this.activeServer.stderr?.on('data', (data: Buffer) => {
                const message = data.toString();
                this.compilationOutput += message;
                // Some frameworks log to stderr, only treat as error if it looks like one
                if (message.toLowerCase().includes('error') || message.toLowerCase().includes('failed')) {
                    onError?.(message.trim());
                } else {
                    onLog?.(message.trim());
                }
            });

            // Handle process errors
            this.activeServer.on('error', (error: Error) => {
                onError?.(`Server process error: ${error.message}`);
            });

            // Handle unexpected exit
            this.activeServer.on('close', (code: number | null) => {
                if (code !== null && code !== 0) {
                    onError?.(`Server exited with code ${code}`);
                }
            });

            // Wait for server to be ready
            onLog?.('Waiting for server to be ready...');
            const isReady = await this.waitForServer(port, timeout, onLog);

            if (isReady) {
                onLog?.(`✅ Server ready on http://localhost:${port}`);
                onReady?.();

                return {
                    success: true,
                    port,
                    process: this.activeServer,
                };
            } else {
                this.stop();
                return {
                    success: false,
                    port,
                    error: `Server failed to start within ${timeout / 1000} seconds`,
                };
            }
        } catch (error: any) {
            this.stop();
            const errorMessage = error.message || 'Unknown server error';
            onError?.(errorMessage);

            return {
                success: false,
                port,
                error: errorMessage,
            };
        }
    }

    /**
     * Stop the development server
     */
    stop(): void {
        if (this.activeServer) {
            try {
                // Try graceful shutdown first
                this.activeServer.kill('SIGTERM');

                // Force kill after 5 seconds if still running
                setTimeout(() => {
                    if (this.activeServer && !this.activeServer.killed) {
                        this.activeServer.kill('SIGKILL');
                    }
                }, 5000);

                this.activeServer.removeAllListeners();
                this.activeServer = null;
            } catch (error) {
                console.error('Error stopping dev server:', error);
            }
        }
    }

    /**
     * Check if server is currently running
     */
    isRunning(): boolean {
        return this.activeServer !== null && !this.activeServer.killed;
    }

    /**
     * Get the active server process
     */
    getProcess(): ChildProcess | null {
        return this.activeServer;
    }

    /**
     * Get recent compilation output (for error checking)
     */
    getCompilationOutput(): string {
        return this.compilationOutput;
    }

    /**
     * Clear compilation output
     */
    clearCompilationOutput(): void {
        this.compilationOutput = '';
    }

    /**
     * Get the dev command for a framework
     */
    private getDevCommand(framework: string): { cmd: string; args: string[] } {
        switch (framework) {
            case 'react':
                return { cmd: 'npm', args: ['start'] };
            case 'nextjs':
                return { cmd: 'npm', args: ['run', 'dev'] };
            case 'vue':
                return { cmd: 'npm', args: ['run', 'dev'] };
            case 'html':
                return { cmd: 'npm', args: ['run', 'dev'] };
            case 'flutter':
                return { cmd: 'flutter', args: ['run', '-d', 'web-server', '--web-port=3000'] };
            default:
                return { cmd: 'npm', args: ['run', 'dev'] };
        }
    }

    /**
     * Wait for server to be ready by checking port availability
     */
    private async waitForServer(
        port: number,
        timeout: number,
        onLog?: (message: string) => void
    ): Promise<boolean> {
        const startTime = Date.now();
        const checkInterval = 1000; // Check every second

        while (Date.now() - startTime < timeout) {
            try {
                // Try to connect to the port
                const isReady = await this.checkPort(port);

                if (isReady) {
                    return true;
                }

                // Wait before next check
                await new Promise(resolve => setTimeout(resolve, checkInterval));

                // Log progress every 5 seconds
                const elapsed = Date.now() - startTime;
                if (elapsed % 5000 < checkInterval) {
                    onLog?.(`Still waiting... (${Math.floor(elapsed / 1000)}s)`);
                }
            } catch (error) {
                // Continue checking
            }
        }

        return false;
    }

    /**
     * Check if a port is ready by attempting to connect
     */
    private async checkPort(port: number): Promise<boolean> {
        return new Promise((resolve) => {
            const net = require('net');
            const socket = new net.Socket();

            socket.setTimeout(1000);

            socket.on('connect', () => {
                socket.destroy();
                resolve(true);
            });

            socket.on('timeout', () => {
                socket.destroy();
                resolve(false);
            });

            socket.on('error', () => {
                socket.destroy();
                resolve(false);
            });

            socket.connect(port, 'localhost');
        });
    }
}
