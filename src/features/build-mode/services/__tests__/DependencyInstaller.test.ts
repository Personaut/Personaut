/**
 * Unit tests for DependencyInstaller
 */

import { DependencyInstaller, InstallOptions, InstallResult } from '../DependencyInstaller';
import { EventEmitter } from 'events';

// Mock child_process
jest.mock('child_process');

describe('DependencyInstaller', () => {
    let installer: DependencyInstaller;
    let mockSpawn: jest.Mock;
    let mockProcess: any;

    beforeEach(() => {
        installer = new DependencyInstaller();

        // Create mock process
        mockProcess = new EventEmitter();
        mockProcess.stdout = new EventEmitter();
        mockProcess.stderr = new EventEmitter();
        mockProcess.kill = jest.fn();
        mockProcess.removeAllListeners = jest.fn();

        // Mock spawn
        const childProcess = require('child_process');
        mockSpawn = childProcess.spawn as jest.Mock;
        mockSpawn.mockReturnValue(mockProcess);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('install', () => {
        it('should successfully install dependencies', async () => {
            const options: InstallOptions = {
                projectPath: '/test/project',
            };

            // Start installation
            const installPromise = installer.install(options);

            // Simulate successful installation
            setTimeout(() => {
                mockProcess.emit('close', 0);
            }, 10);

            const result: InstallResult = await installPromise;

            expect(result.success).toBe(true);
            expect(result.duration).toBeGreaterThan(0);
            expect(result.error).toBeUndefined();
            expect(mockSpawn).toHaveBeenCalledWith('npm', ['install'], {
                cwd: '/test/project',
                shell: true,
            });
        });

        it('should handle installation failure', async () => {
            const options: InstallOptions = {
                projectPath: '/test/project',
            };

            const installPromise = installer.install(options);

            // Simulate failed installation
            setTimeout(() => {
                mockProcess.stderr.emit('data', Buffer.from('Error: Package not found'));
                mockProcess.emit('close', 1);
            }, 10);

            const result = await installPromise;

            expect(result.success).toBe(false);
            expect(result.error).toContain('Package not found');
        });

        it('should call progress callback with stdout messages', async () => {
            const onProgress = jest.fn();
            const options: InstallOptions = {
                projectPath: '/test/project',
                onProgress,
            };

            const installPromise = installer.install(options);

            // Simulate progress messages
            setTimeout(() => {
                mockProcess.stdout.emit('data', Buffer.from('Installing package-a'));
                mockProcess.stdout.emit('data', Buffer.from('Installing package-b'));
                mockProcess.emit('close', 0);
            }, 10);

            await installPromise;

            expect(onProgress).toHaveBeenCalledWith('Installing dependencies...');
            expect(onProgress).toHaveBeenCalledWith('Installing package-a');
            expect(onProgress).toHaveBeenCalledWith('Installing package-b');
            expect(onProgress).toHaveBeenCalledWith('Dependencies installed successfully');
        });

        it('should call error callback on stderr errors', async () => {
            const onError = jest.fn();
            const options: InstallOptions = {
                projectPath: '/test/project',
                onError,
            };

            const installPromise = installer.install(options);

            setTimeout(() => {
                mockProcess.stderr.emit('data', Buffer.from('Error: Network timeout'));
                mockProcess.emit('close', 1);
            }, 10);

            await installPromise;

            expect(onError).toHaveBeenCalledWith('Error: Network timeout');
        });

        it('should handle process errors', async () => {
            const options: InstallOptions = {
                projectPath: '/test/project',
            };

            const installPromise = installer.install(options);

            setTimeout(() => {
                mockProcess.emit('error', new Error('spawn ENOENT'));
            }, 10);

            const result = await installPromise;

            expect(result.success).toBe(false);
            expect(result.error).toContain('spawn ENOENT');
        });

        it('should timeout after specified duration', async () => {
            const options: InstallOptions = {
                projectPath: '/test/project',
                timeout: 100, // 100ms timeout
            };

            const installPromise = installer.install(options);

            // Don't emit close event, let it timeout
            await new Promise(resolve => setTimeout(resolve, 150));

            const result = await installPromise;

            expect(result.success).toBe(false);
            expect(result.error).toContain('timed out');
            expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
        });

        it('should support cancellation', async () => {
            const options: InstallOptions = {
                projectPath: '/test/project',
            };

            const installPromise = installer.install(options);

            // Cancel after a short delay
            setTimeout(() => {
                installer.cancel();
                mockProcess.emit('close', null);
            }, 10);

            const result = await installPromise;

            expect(result.success).toBe(false);
            expect(result.error).toContain('cancelled');
            expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
        });

        it('should handle cancellation before process starts', async () => {
            const options: InstallOptions = {
                projectPath: '/test/project',
            };

            // Cancel immediately
            installer.cancel();

            const installPromise = installer.install(options);

            // Need to emit close event for promise to resolve
            setTimeout(() => {
                mockProcess.emit('close', null);
            }, 10);

            const result = await installPromise;

            expect(result.success).toBe(false);
            expect(result.error).toContain('Cancelled');
        });

        it('should cleanup resources after completion', async () => {
            const options: InstallOptions = {
                projectPath: '/test/project',
            };

            const installPromise = installer.install(options);

            setTimeout(() => {
                mockProcess.emit('close', 0);
            }, 10);

            await installPromise;

            expect(mockProcess.removeAllListeners).toHaveBeenCalled();
        });

        it('should measure installation duration', async () => {
            const options: InstallOptions = {
                projectPath: '/test/project',
            };

            const installPromise = installer.install(options);

            // Wait 50ms before completing
            await new Promise(resolve => setTimeout(resolve, 50));
            mockProcess.emit('close', 0);

            const result = await installPromise;

            expect(result.duration).toBeGreaterThanOrEqual(50);
        });

        it('should not treat all stderr output as errors', async () => {
            const onError = jest.fn();
            const options: InstallOptions = {
                projectPath: '/test/project',
                onError,
            };

            const installPromise = installer.install(options);

            setTimeout(() => {
                // npm writes progress to stderr
                mockProcess.stderr.emit('data', Buffer.from('npm WARN deprecated package@1.0.0'));
                mockProcess.emit('close', 0);
            }, 10);

            await installPromise;

            // Should not call onError for warnings
            expect(onError).not.toHaveBeenCalled();
        });
    });

    describe('cancel', () => {
        it('should kill active process', () => {
            const options: InstallOptions = {
                projectPath: '/test/project',
            };

            installer.install(options);
            installer.cancel();

            expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
        });

        it('should be safe to call when no process is active', () => {
            expect(() => installer.cancel()).not.toThrow();
        });
    });
});
