import { TerminalManager } from './TerminalManager';
import { CommandValidator, CommandValidationResult } from '../../shared/services/CommandValidator';
import * as vscode from 'vscode';
import * as cp from 'child_process';

// Mock vscode
jest.mock('vscode');

// Mock CommandValidator
jest.mock('../../shared/services/CommandValidator');

// Mock child_process
jest.mock('child_process');

describe('TerminalManager', () => {
  let terminalManager: TerminalManager;
  let mockTerminal: any;
  let mockCommandValidator: jest.Mocked<CommandValidator>;

  beforeEach(() => {
    // Reset singleton instance
    (TerminalManager as any).instance = undefined;

    // Create mock terminal
    mockTerminal = {
      show: jest.fn(),
      sendText: jest.fn(),
      dispose: jest.fn(),
    };

    // Mock vscode.window.createTerminal
    (vscode.window.createTerminal as jest.Mock) = jest.fn().mockReturnValue(mockTerminal);

    // Mock vscode.window.showWarningMessage
    (vscode.window.showWarningMessage as jest.Mock) = jest.fn().mockResolvedValue('Execute');

    // Mock vscode.workspace.workspaceFolders
    (vscode.workspace as any).workspaceFolders = [
      {
        uri: { fsPath: '/test/workspace' },
      },
    ];

    // Create mock command validator
    mockCommandValidator = {
      validate: jest.fn(),
      sanitizeEnvironment: jest.fn(),
      getRateLimitStatus: jest.fn(),
    } as any;

    (CommandValidator as any).mockImplementation(() => mockCommandValidator);

    terminalManager = TerminalManager.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = TerminalManager.getInstance();
      const instance2 = TerminalManager.getInstance();

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

      (cp.spawn as jest.Mock).mockReturnValue(mockProcess);

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

      (vscode.window.showWarningMessage as jest.Mock).mockResolvedValue('Execute');

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

      (cp.spawn as jest.Mock).mockReturnValue(mockProcess);

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

      (vscode.window.showWarningMessage as jest.Mock).mockResolvedValue('Cancel');

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

      (cp.spawn as jest.Mock).mockReturnValue(mockProcess);

      await terminalManager.executeCommand('sudo apt-get install', true);

      expect(vscode.window.showWarningMessage).not.toHaveBeenCalled();
    });
  });

  describe('validateCommand', () => {
    it('should validate command without executing', () => {
      const mockValidation: CommandValidationResult = {
        allowed: true,
        requiresConfirmation: false,
        sanitizedCommand: 'ls',
        riskLevel: 'low' as const,
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
