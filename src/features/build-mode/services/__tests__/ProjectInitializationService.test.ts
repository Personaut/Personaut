/**
 * Unit tests for ProjectInitializationService
 */

import { ProjectInitializationService } from '../ProjectInitializationService';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

jest.mock('fs');
jest.mock('child_process');
jest.mock('util', () => ({
    promisify: jest.fn((fn) => fn),
}));

describe('ProjectInitializationService', () => {
    let service: ProjectInitializationService;

    beforeEach(() => {
        service = new ProjectInitializationService();
        jest.clearAllMocks();
    });

    describe('validateProjectName', () => {
        it('should accept valid project names', () => {
            const validNames = ['my-project', 'MyProject', 'project_123', 'test-app-v2'];

            validNames.forEach(name => {
                const result = service.validateProjectName(name);
                expect(result.valid).toBe(true);
                expect(result.error).toBeUndefined();
            });
        });

        it('should reject empty project names', () => {
            const result = service.validateProjectName('');
            expect(result.valid).toBe(false);
            expect(result.error).toContain('cannot be empty');
        });

        it('should reject project names with path separators', () => {
            const invalidNames = ['my/project', 'my\\project', '../project'];

            invalidNames.forEach(name => {
                const result = service.validateProjectName(name);
                expect(result.valid).toBe(false);
            });
        });

        it('should reject project names with special characters', () => {
            const invalidNames = ['my@project', 'project!', 'test project', 'app#1'];

            invalidNames.forEach(name => {
                const result = service.validateProjectName(name);
                expect(result.valid).toBe(false);
                expect(result.error).toContain('letters, numbers, hyphens, and underscores');
            });
        });

        it('should reject project names with path traversal attempts', () => {
            const result = service.validateProjectName('..');
            expect(result.valid).toBe(false);
            expect(result.error).toContain('cannot contain ..');
        });
    });

    describe('getInitCommand', () => {
        it('should return correct command for React', () => {
            const command = (service as any).getInitCommand('my-app', 'react');
            expect(command).toContain('create-react-app');
            expect(command).toContain('my-app');
        });

        it('should return correct command for Next.js', () => {
            const command = (service as any).getInitCommand('my-app', 'nextjs');
            expect(command).toContain('create-next-app');
            expect(command).toContain('my-app');
            expect(command).toContain('--typescript');
        });

        it('should return correct command for Vue', () => {
            const command = (service as any).getInitCommand('my-app', 'vue');
            expect(command).toContain('create-vue');
            expect(command).toContain('my-app');
        });

        it('should return correct command for HTML', () => {
            const command = (service as any).getInitCommand('my-app', 'html');
            expect(command).toContain('mkdir');
            expect(command).toContain('index.html');
        });

        it('should throw error for unsupported framework', () => {
            expect(() => {
                (service as any).getInitCommand('my-app', 'angular');
            }).toThrow('Unsupported framework');
        });
    });

    describe('projectExists', () => {
        it('should return true if project directory exists', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);

            const exists = service.projectExists('/path/to/project');
            expect(exists).toBe(true);
            expect(fs.existsSync).toHaveBeenCalledWith('/path/to/project');
        });

        it('should return false if project directory does not exist', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(false);

            const exists = service.projectExists('/path/to/project');
            expect(exists).toBe(false);
        });
    });

    describe('getProjectPath', () => {
        it('should combine base directory and project name', () => {
            const path = service.getProjectPath('/base/dir', 'my-project');
            expect(path).toContain('base');
            expect(path).toContain('my-project');
        });
    });

    describe('initializeProject', () => {
        it('should fail if project directory already exists', async () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);

            const result = await service.initializeProject({
                projectName: 'existing-project',
                framework: 'react',
                baseDirectory: '/base/dir',
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('already exists');
        });

        it('should create directory and initialize framework', async () => {
            (fs.existsSync as jest.Mock).mockReturnValue(false);

            // Mock fs.promises.mkdir
            const mockMkdir = jest.fn().mockResolvedValue(undefined);
            Object.defineProperty(fs, 'promises', {
                value: { mkdir: mockMkdir },
                writable: true,
            });

            const mockExec = exec as unknown as jest.Mock;
            mockExec.mockImplementation((_cmd, _opts, callback) => {
                callback(null, { stdout: 'Success', stderr: '' });
            });

            const result = await service.initializeProject({
                projectName: 'new-project',
                framework: 'react',
                baseDirectory: '/base/dir',
            });

            expect(result.success).toBe(true);
            expect(mockMkdir).toHaveBeenCalled();
        });
    });
});
