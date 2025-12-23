/**
 * Unit tests for DevServerManager
 */

import { DevServerManager, DevServerOptions } from '../DevServerManager';
import { EventEmitter } from 'events';

// Mock child_process and net
jest.mock('child_process');
jest.mock('net');

describe('DevServerManager', () => {
    let manager: DevServerManager;
    let mockSpawn: jest.Mock;
    let mockProcess: any;
    let mockSocket: any;

    beforeEach(() => {
        manager = new DevServerManager();

        // Create mock process
        mockProcess = new EventEmitter();
        mockProcess.stdout = new EventEmitter();
        mockProcess.stderr = new EventEmitter();
        mockProcess.kill = jest.fn();
        mockProcess.killed = false;
        mockProcess.removeAllListeners = jest.fn();

        // Mock spawn
        const childProcess = require('child_process');
        mockSpawn = childProcess.spawn as jest.Mock;
        mockSpawn.mockReturnValue(mockProcess);

        // Mock socket
        mockSocket = new EventEmitter();
        mockSocket.setTimeout = jest.fn();
        mockSocket.connect = jest.fn();
        mockSocket.destroy = jest.fn();

        const net = require('net');
        net.Socket = jest.fn(() => mockSocket);
    });

    afterEach(() => {
        jest.clearAllMocks();
        manager.stop();
    });

    describe('start', () => {
        it('should start React dev server', async () => {
            const options: DevServerOptions = {
                projectPath: '/test/project',
                framework: 'react',
            };

            const startPromise = manager.start(options);

            // Simulate port becoming ready
            setTimeout(() => {
                mockSocket.emit('connect');
            }, 10);

            const result = await startPromise;

            expect(result.success).toBe(true);
            expect(result.port).toBe(3000);
            expect(result.process).toBe(mockProcess);
            expect(mockSpawn).toHaveBeenCalledWith('npm', ['start'], expect.any(Object));
        });

        it('should start Next.js dev server', async () => {
            const options: DevServerOptions = {
                projectPath: '/test/project',
                framework: 'nextjs',
            };

            const startPromise = manager.start(options);

            setTimeout(() => {
                mockSocket.emit('connect');
            }, 10);

            await startPromise;

            expect(mockSpawn).toHaveBeenCalledWith('npm', ['run', 'dev'], expect.any(Object));
        });

        it('should use custom port', async () => {
            const options: DevServerOptions = {
                projectPath: '/test/project',
                framework: 'react',
                port: 8080,
            };

            const startPromise = manager.start(options);

            setTimeout(() => {
                mockSocket.emit('connect');
            }, 10);

            const result = await startPromise;

            expect(result.port).toBe(8080);
            expect(mockSpawn).toHaveBeenCalledWith(
                'npm',
                ['start'],
                expect.objectContaining({
                    env: expect.objectContaining({
                        PORT: '8080',
                    }),
                })
            );
        });

        it('should call onLog callback', async () => {
            const onLog = jest.fn();
            const options: DevServerOptions = {
                projectPath: '/test/project',
                framework: 'react',
                onLog,
            };

            const startPromise = manager.start(options);

            setTimeout(() => {
                mockProcess.stdout.emit('data', Buffer.from('Server starting...'));
                mockSocket.emit('connect');
            }, 10);

            await startPromise;

            expect(onLog).toHaveBeenCalledWith(expect.stringContaining('Starting'));
            expect(onLog).toHaveBeenCalledWith('Server starting...');
        });

        it('should call onReady callback when server is ready', async () => {
            const onReady = jest.fn();
            const options: DevServerOptions = {
                projectPath: '/test/project',
                framework: 'react',
                onReady,
            };

            const startPromise = manager.start(options);

            setTimeout(() => {
                mockSocket.emit('connect');
            }, 10);

            await startPromise;

            expect(onReady).toHaveBeenCalled();
        });

        it('should handle server startup timeout', async () => {
            const options: DevServerOptions = {
                projectPath: '/test/project',
                framework: 'react',
                timeout: 100, // 100ms timeout
            };

            // Don't emit connect, let it timeout
            const result = await manager.start(options);

            expect(result.success).toBe(false);
            expect(result.error).toContain('failed to start');
        });

        it('should handle process errors', async () => {
            const onError = jest.fn();
            const options: DevServerOptions = {
                projectPath: '/test/project',
                framework: 'react',
                onError,
            };

            const startPromise = manager.start(options);

            setTimeout(() => {
                mockProcess.emit('error', new Error('spawn ENOENT'));
            }, 10);

            // Still need to resolve port check
            setTimeout(() => {
                mockSocket.emit('error');
            }, 20);

            await startPromise;

            expect(onError).toHaveBeenCalledWith(expect.stringContaining('spawn ENOENT'));
        });

        it('should set BROWSER=none to prevent auto-opening', async () => {
            const options: DevServerOptions = {
                projectPath: '/test/project',
                framework: 'react',
            };

            const startPromise = manager.start(options);

            setTimeout(() => {
                mockSocket.emit('connect');
            }, 10);

            await startPromise;

            expect(mockSpawn).toHaveBeenCalledWith(
                'npm',
                ['start'],
                expect.objectContaining({
                    env: expect.objectContaining({
                        BROWSER: 'none',
                    }),
                })
            );
        });
    });

    describe('stop', () => {
        it('should kill active server process', async () => {
            const options: DevServerOptions = {
                projectPath: '/test/project',
                framework: 'react',
            };

            const startPromise = manager.start(options);

            setTimeout(() => {
                mockSocket.emit('connect');
            }, 10);

            await startPromise;

            manager.stop();

            expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
            expect(mockProcess.removeAllListeners).toHaveBeenCalled();
        });

        it('should be safe to call when no server is running', () => {
            expect(() => manager.stop()).not.toThrow();
        });

        it('should force kill if graceful shutdown fails', async () => {
            jest.useFakeTimers();

            const options: DevServerOptions = {
                projectPath: '/test/project',
                framework: 'react',
            };

            const startPromise = manager.start(options);

            setTimeout(() => {
                mockSocket.emit('connect');
            }, 10);

            await startPromise;

            // Simulate process not dying
            mockProcess.killed = false;

            manager.stop();

            // Fast-forward 5 seconds
            jest.advanceTimersByTime(5000);

            expect(mockProcess.kill).toHaveBeenCalledWith('SIGKILL');

            jest.useRealTimers();
        });
    });

    describe('isRunning', () => {
        it('should return false when no server is running', () => {
            expect(manager.isRunning()).toBe(false);
        });

        it('should return true when server is running', async () => {
            const options: DevServerOptions = {
                projectPath: '/test/project',
                framework: 'react',
            };

            const startPromise = manager.start(options);

            setTimeout(() => {
                mockSocket.emit('connect');
            }, 10);

            await startPromise;

            expect(manager.isRunning()).toBe(true);
        });

        it('should return false after server is stopped', async () => {
            const options: DevServerOptions = {
                projectPath: '/test/project',
                framework: 'react',
            };

            const startPromise = manager.start(options);

            setTimeout(() => {
                mockSocket.emit('connect');
            }, 10);

            await startPromise;

            manager.stop();

            expect(manager.isRunning()).toBe(false);
        });
    });

    describe('getProcess', () => {
        it('should return null when no server is running', () => {
            expect(manager.getProcess()).toBeNull();
        });

        it('should return process when server is running', async () => {
            const options: DevServerOptions = {
                projectPath: '/test/project',
                framework: 'react',
            };

            const startPromise = manager.start(options);

            setTimeout(() => {
                mockSocket.emit('connect');
            }, 10);

            await startPromise;

            expect(manager.getProcess()).toBe(mockProcess);
        });
    });
});
