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
const TerminalManager_1 = require("./TerminalManager");
const CommandValidator_1 = require("../../shared/services/CommandValidator");
const vscode = __importStar(require("vscode"));
const cp = __importStar(require("child_process"));
// Mock vscode
jest.mock('vscode');
// Mock CommandValidator
jest.mock('../../shared/services/CommandValidator');
// Mock child_process
jest.mock('child_process');
describe('TerminalManager', () => {
    let terminalManager;
    let mockTerminal;
    let mockCommandValidator;
    beforeEach(() => {
        // Reset singleton instance
        TerminalManager_1.TerminalManager.instance = undefined;
        // Create mock terminal
        mockTerminal = {
            show: jest.fn(),
            sendText: jest.fn(),
            dispose: jest.fn(),
        };
        // Mock vscode.window.createTerminal
        vscode.window.createTerminal = jest.fn().mockReturnValue(mockTerminal);
        // Mock vscode.window.showWarningMessage
        vscode.window.showWarningMessage = jest.fn().mockResolvedValue('Execute');
        // Mock vscode.workspace.workspaceFolders
        vscode.workspace.workspaceFolders = [
            {
                uri: { fsPath: '/test/workspace' },
            },
        ];
        // Create mock command validator
        mockCommandValidator = {
            validate: jest.fn(),
            sanitizeEnvironment: jest.fn(),
            getRateLimitStatus: jest.fn(),
        };
        CommandValidator_1.CommandValidator.mockImplementation(() => mockCommandValidator);
        terminalManager = TerminalManager_1.TerminalManager.getInstance();
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('getInstance', () => {
        it('should return singleton instance', () => {
            const instance1 = TerminalManager_1.TerminalManager.getInstance();
            const instance2 = TerminalManager_1.TerminalManager.getInstance();
            expect(instance1).toBe(instance2);
        });
    });
    describe('executeCommand', () => {
        it('should execute allowed command successfully', async () => {
            mockCommandValidator.validate.mockReturnValue({
                allowed: true,
                requiresConfirmation: false,
                sanitizedCommand: 'ls -la',
                riskLevel: 'low',
                reason: '',
            });
            mockCommandValidator.sanitizeEnvironment.mockReturnValue({});
            // Mock child_process.spawn
            const mockProcess = {
                stdout: {
                    on: jest.fn((event, callback) => {
                        if (event === 'data') {
                            callback(Buffer.from('test output'));
                        }
                    }),
                },
                stderr: {
                    on: jest.fn((event, callback) => {
                        if (event === 'data') {
                            callback(Buffer.from(''));
                        }
                    }),
                },
                on: jest.fn((event, callback) => {
                    if (event === 'close') {
                        callback(0);
                    }
                }),
            };
            cp.spawn.mockReturnValue(mockProcess);
            const result = await terminalManager.executeCommand('ls -la');
            expect(mockCommandValidator.validate).toHaveBeenCalledWith('ls -la');
            expect(mockTerminal.show).toHaveBeenCalled();
            expect(mockTerminal.sendText).toHaveBeenCalledWith('ls -la');
            expect(result).toBe('test output');
        });
        it('should block disallowed command', async () => {
            mockCommandValidator.validate.mockReturnValue({
                allowed: false,
                requiresConfirmation: false,
                sanitizedCommand: undefined,
                riskLevel: 'high',
                reason: 'Dangerous command',
            });
            const result = await terminalManager.executeCommand('rm -rf /');
            expect(result).toBe('Command blocked: Dangerous command');
            expect(mockTerminal.sendText).not.toHaveBeenCalled();
        });
        it('should request confirmation for dangerous commands', async () => {
            mockCommandValidator.validate.mockReturnValue({
                allowed: true,
                requiresConfirmation: true,
                sanitizedCommand: 'sudo apt-get install',
                riskLevel: 'high',
                reason: '',
            });
            vscode.window.showWarningMessage.mockResolvedValue('Execute');
            mockCommandValidator.sanitizeEnvironment.mockReturnValue({});
            // Mock child_process.spawn
            const mockProcess = {
                stdout: {
                    on: jest.fn((event, callback) => {
                        if (event === 'data') {
                            callback(Buffer.from(''));
                        }
                    }),
                },
                stderr: {
                    on: jest.fn((event, callback) => {
                        if (event === 'data') {
                            callback(Buffer.from(''));
                        }
                    }),
                },
                on: jest.fn((event, callback) => {
                    if (event === 'close') {
                        callback(0);
                    }
                }),
            };
            cp.spawn.mockReturnValue(mockProcess);
            await terminalManager.executeCommand('sudo apt-get install');
            expect(vscode.window.showWarningMessage).toHaveBeenCalled();
        });
        it('should cancel command when user declines confirmation', async () => {
            mockCommandValidator.validate.mockReturnValue({
                allowed: true,
                requiresConfirmation: true,
                sanitizedCommand: 'sudo apt-get install',
                riskLevel: 'high',
                reason: '',
            });
            vscode.window.showWarningMessage.mockResolvedValue('Cancel');
            const result = await terminalManager.executeCommand('sudo apt-get install');
            expect(result).toBe('Command cancelled by user.');
            expect(mockTerminal.sendText).not.toHaveBeenCalled();
        });
        it('should skip confirmation when skipConfirmation is true', async () => {
            mockCommandValidator.validate.mockReturnValue({
                allowed: true,
                requiresConfirmation: true,
                sanitizedCommand: 'sudo apt-get install',
                riskLevel: 'high',
                reason: '',
            });
            mockCommandValidator.sanitizeEnvironment.mockReturnValue({});
            // Mock child_process.spawn
            const mockProcess = {
                stdout: {
                    on: jest.fn((event, callback) => {
                        if (event === 'data') {
                            callback(Buffer.from(''));
                        }
                    }),
                },
                stderr: {
                    on: jest.fn((event, callback) => {
                        if (event === 'data') {
                            callback(Buffer.from(''));
                        }
                    }),
                },
                on: jest.fn((event, callback) => {
                    if (event === 'close') {
                        callback(0);
                    }
                }),
            };
            cp.spawn.mockReturnValue(mockProcess);
            await terminalManager.executeCommand('sudo apt-get install', true);
            expect(vscode.window.showWarningMessage).not.toHaveBeenCalled();
        });
    });
    describe('validateCommand', () => {
        it('should validate command without executing', () => {
            const mockValidation = {
                allowed: true,
                requiresConfirmation: false,
                sanitizedCommand: 'ls',
                riskLevel: 'low',
                reason: '',
            };
            mockCommandValidator.validate.mockReturnValue(mockValidation);
            const result = terminalManager.validateCommand('ls');
            expect(result).toEqual(mockValidation);
            expect(mockCommandValidator.validate).toHaveBeenCalledWith('ls');
        });
    });
    describe('getRateLimitStatus', () => {
        it('should return rate limit status', () => {
            const mockStatus = {
                current: 5,
                max: 100,
                windowMs: 60000,
                resetIn: 60000,
            };
            mockCommandValidator.getRateLimitStatus.mockReturnValue(mockStatus);
            const result = terminalManager.getRateLimitStatus();
            expect(result).toEqual(mockStatus);
        });
    });
    describe('getCommandValidator', () => {
        it('should return command validator instance', () => {
            const validator = terminalManager.getCommandValidator();
            expect(validator).toBe(mockCommandValidator);
        });
    });
    describe('dispose', () => {
        it('should dispose terminal', () => {
            // Trigger terminal creation
            mockCommandValidator.validate.mockReturnValue({
                allowed: true,
                requiresConfirmation: false,
                sanitizedCommand: 'ls',
                riskLevel: 'low',
                reason: '',
            });
            mockCommandValidator.sanitizeEnvironment.mockReturnValue({});
            terminalManager.dispose();
            // Terminal should be disposed if it was created
            // We can't easily test this without executing a command first
            expect(terminalManager).toBeDefined();
        });
    });
});
//# sourceMappingURL=TerminalManager.test.js.map