/**
 * Port Utilities - Helper functions for port availability checking
 *
 * Provides utilities to:
 * - Check if a port is available/in use
 * - Wait for a port to become ready
 * - Find available ports
 *
 * Validates: Build Mode Requirements - Dev Server Management
 */

import * as net from 'net';

export interface WaitForPortOptions {
    port: number;
    timeout?: number; // milliseconds, default 60000 (1 minute)
    retryInterval?: number; // milliseconds, default 1000 (1 second)
    onProgress?: (elapsed: number) => void;
}

/**
 * Wait for a port to become ready (accepting connections)
 * 
 * @param options - Port waiting options
 * @returns Promise<boolean> - true if port is ready, false if timeout
 */
export async function waitForPort(options: WaitForPortOptions): Promise<boolean> {
    const {
        port,
        timeout = 60000,
        retryInterval = 1000,
        onProgress,
    } = options;

    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
        const isReady = await checkPort(port);

        if (isReady) {
            return true;
        }

        // Wait before next check
        await sleep(retryInterval);

        // Report progress
        const elapsed = Date.now() - startTime;
        onProgress?.(elapsed);
    }

    return false;
}

/**
 * Check if a port is ready by attempting to connect
 * 
 * @param port - Port number to check
 * @param host - Host to check (default: 'localhost')
 * @param connectionTimeout - Connection timeout in ms (default: 1000)
 * @returns Promise<boolean> - true if port is ready, false otherwise
 */
export async function checkPort(
    port: number,
    host: string = 'localhost',
    connectionTimeout: number = 1000
): Promise<boolean> {
    return new Promise((resolve) => {
        const socket = new net.Socket();

        socket.setTimeout(connectionTimeout);

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

        socket.connect(port, host);
    });
}

/**
 * Check if a port is available (not in use)
 * 
 * @param port - Port number to check
 * @returns Promise<boolean> - true if port is available, false if in use
 */
export async function isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
        const server = net.createServer();

        server.once('error', () => {
            resolve(false);
        });

        server.once('listening', () => {
            server.close();
            resolve(true);
        });

        server.listen(port);
    });
}

/**
 * Find an available port starting from a given port
 * 
 * @param startPort - Port to start searching from (default: 3000)
 * @param maxAttempts - Maximum number of ports to try (default: 100)
 * @returns Promise<number | null> - Available port number or null if none found
 */
export async function findAvailablePort(
    startPort: number = 3000,
    maxAttempts: number = 100
): Promise<number | null> {
    for (let i = 0; i < maxAttempts; i++) {
        const port = startPort + i;
        const available = await isPortAvailable(port);

        if (available) {
            return port;
        }
    }

    return null;
}

/**
 * Sleep for a specified duration
 * 
 * @param ms - Milliseconds to sleep
 * @returns Promise<void>
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
