/**
 * Unit tests for portUtils
 */

import {
    waitForPort,
    checkPort,
    isPortAvailable,
    findAvailablePort,
} from '../portUtils';
import * as net from 'net';

// Mock net module
jest.mock('net');

describe('portUtils', () => {
    let mockSocket: any;
    let mockServer: any;

    beforeEach(() => {
        // Mock socket
        mockSocket = {
            setTimeout: jest.fn(),
            connect: jest.fn(),
            destroy: jest.fn(),
            on: jest.fn(),
        };

        // Mock server
        mockServer = {
            listen: jest.fn(),
            close: jest.fn(),
            once: jest.fn(),
        };

        jest.spyOn(net, 'Socket').mockImplementation(() => mockSocket as any);
        jest.spyOn(net, 'createServer').mockImplementation(() => mockServer as any);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('checkPort', () => {
        it('should return true when port is ready', async () => {
            // Simulate successful connection
            mockSocket.on.mockImplementation((event: string, callback: Function) => {
                if (event === 'connect') {
                    setTimeout(() => callback(), 10);
                }
            });

            const result = await checkPort(3000);

            expect(result).toBe(true);
            expect(mockSocket.connect).toHaveBeenCalledWith(3000, 'localhost');
            expect(mockSocket.destroy).toHaveBeenCalled();
        });

        it('should return false on timeout', async () => {
            mockSocket.on.mockImplementation((event: string, callback: Function) => {
                if (event === 'timeout') {
                    setTimeout(() => callback(), 10);
                }
            });

            const result = await checkPort(3000);

            expect(result).toBe(false);
            expect(mockSocket.destroy).toHaveBeenCalled();
        });

        it('should return false on error', async () => {
            mockSocket.on.mockImplementation((event: string, callback: Function) => {
                if (event === 'error') {
                    setTimeout(() => callback(), 10);
                }
            });

            const result = await checkPort(3000);

            expect(result).toBe(false);
            expect(mockSocket.destroy).toHaveBeenCalled();
        });

        it('should use custom host', async () => {
            mockSocket.on.mockImplementation((event: string, callback: Function) => {
                if (event === 'connect') {
                    setTimeout(() => callback(), 10);
                }
            });

            await checkPort(8080, '127.0.0.1');

            expect(mockSocket.connect).toHaveBeenCalledWith(8080, '127.0.0.1');
        });
    });

    describe('isPortAvailable', () => {
        it('should return true when port is available', async () => {
            mockServer.once.mockImplementation((event: string, callback: Function) => {
                if (event === 'listening') {
                    setTimeout(() => callback(), 10);
                }
            });

            const result = await isPortAvailable(3000);

            expect(result).toBe(true);
            expect(mockServer.listen).toHaveBeenCalledWith(3000);
            expect(mockServer.close).toHaveBeenCalled();
        });

        it('should return false when port is in use', async () => {
            mockServer.once.mockImplementation((event: string, callback: Function) => {
                if (event === 'error') {
                    setTimeout(() => callback(), 10);
                }
            });

            const result = await isPortAvailable(3000);

            expect(result).toBe(false);
            expect(mockServer.listen).toHaveBeenCalledWith(3000);
        });
    });

    describe('findAvailablePort', () => {
        it('should find first available port', async () => {
            let callCount = 0;
            mockServer.once.mockImplementation((event: string, callback: Function) => {
                callCount++;
                // First two ports are in use, third is available
                if (event === 'error' && callCount <= 2) {
                    setTimeout(() => callback(), 10);
                } else if (event === 'listening' && callCount === 3) {
                    setTimeout(() => callback(), 10);
                }
            });

            const result = await findAvailablePort(3000);

            expect(result).toBe(3002); // 3000 and 3001 were in use
        });

        it('should return null if no port available', async () => {
            mockServer.once.mockImplementation((event: string, callback: Function) => {
                if (event === 'error') {
                    setTimeout(() => callback(), 10);
                }
            });

            const result = await findAvailablePort(3000, 3); // Only try 3 ports

            expect(result).toBeNull();
        });

        it('should use custom start port', async () => {
            mockServer.once.mockImplementation((event: string, callback: Function) => {
                if (event === 'listening') {
                    setTimeout(() => callback(), 10);
                }
            });

            const result = await findAvailablePort(8000);

            expect(result).toBe(8000);
        });
    });

    describe('waitForPort', () => {
        it('should return true when port becomes ready', async () => {
            let attempts = 0;
            mockSocket.on.mockImplementation((event: string, callback: Function) => {
                attempts++;
                // Port becomes ready on second attempt
                if (event === 'connect' && attempts >= 2) {
                    setTimeout(() => callback(), 10);
                } else if (event === 'error') {
                    setTimeout(() => callback(), 10);
                }
            });

            const result = await waitForPort({
                port: 3000,
                retryInterval: 50,
            });

            expect(result).toBe(true);
        });

        it('should return false on timeout', async () => {
            mockSocket.on.mockImplementation((event: string, callback: Function) => {
                if (event === 'error') {
                    setTimeout(() => callback(), 10);
                }
            });

            const result = await waitForPort({
                port: 3000,
                timeout: 100,
                retryInterval: 30,
            });

            expect(result).toBe(false);
        });

        it('should call onProgress callback', async () => {
            const onProgress = jest.fn();
            let attempts = 0;

            mockSocket.on.mockImplementation((event: string, callback: Function) => {
                attempts++;
                if (event === 'connect' && attempts >= 2) {
                    setTimeout(() => callback(), 10);
                } else if (event === 'error') {
                    setTimeout(() => callback(), 10);
                }
            });

            await waitForPort({
                port: 3000,
                retryInterval: 50,
                onProgress,
            });

            expect(onProgress).toHaveBeenCalled();
            expect(onProgress.mock.calls[0][0]).toBeGreaterThan(0); // elapsed time
        });
    });
});
