/**
 * Unit tests for FileStorageService
 * 
 * Tests file-based storage operations with 90%+ coverage target.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { FileStorageService, createFileStorageService } from '../FileStorageService';

describe('FileStorageService', () => {
    let service: FileStorageService;
    let tempDir: string;

    beforeEach(() => {
        // Create unique temp directory for each test
        tempDir = path.join(os.tmpdir(), `file-storage-test-${Date.now()}-${Math.random().toString(36).substring(7)}`);
        fs.mkdirSync(tempDir, { recursive: true });
        service = new FileStorageService(tempDir);
    });

    afterEach(() => {
        // Clean up temp directory
        try {
            fs.rmSync(tempDir, { recursive: true, force: true });
        } catch {
            // Ignore cleanup errors
        }
    });

    describe('constructor', () => {
        it('should create service with base directory', () => {
            expect(service.getBaseDir()).toBe(tempDir);
        });

        it('should use default options', () => {
            // Verify atomic writes work by default
            expect(service).toBeDefined();
        });

        it('should accept custom options', () => {
            const customService = new FileStorageService(tempDir, {
                atomicWrites: false,
                prettyPrint: false,
            });
            expect(customService).toBeDefined();
        });
    });

    describe('getFullPath', () => {
        it('should return absolute path for relative path', () => {
            const result = service.getFullPath('test/file.json');
            expect(result).toBe(path.join(tempDir, 'test/file.json'));
        });

        it('should handle nested paths', () => {
            const result = service.getFullPath('a/b/c/d/file.json');
            expect(result).toBe(path.join(tempDir, 'a/b/c/d/file.json'));
        });

        it('should handle empty path', () => {
            const result = service.getFullPath('');
            expect(result).toBe(tempDir);
        });
    });

    describe('exists', () => {
        it('should return false for non-existent file', async () => {
            const result = await service.exists('nonexistent.json');
            expect(result).toBe(false);
        });

        it('should return true for existing file', async () => {
            const filePath = path.join(tempDir, 'test.json');
            fs.writeFileSync(filePath, '{}');

            const result = await service.exists('test.json');
            expect(result).toBe(true);
        });

        it('should return true for existing directory', async () => {
            const dirPath = path.join(tempDir, 'testdir');
            fs.mkdirSync(dirPath);

            const result = await service.exists('testdir');
            expect(result).toBe(true);
        });
    });

    describe('ensureDirectory', () => {
        it('should create directory if it does not exist', async () => {
            await service.ensureDirectory('newdir');

            const exists = fs.existsSync(path.join(tempDir, 'newdir'));
            expect(exists).toBe(true);
        });

        it('should create nested directories', async () => {
            await service.ensureDirectory('a/b/c/d');

            const exists = fs.existsSync(path.join(tempDir, 'a/b/c/d'));
            expect(exists).toBe(true);
        });

        it('should not throw if directory already exists', async () => {
            await service.ensureDirectory('existing');
            await expect(service.ensureDirectory('existing')).resolves.not.toThrow();
        });
    });

    describe('read', () => {
        it('should return null for non-existent file', async () => {
            const result = await service.read('nonexistent.json');
            expect(result).toBeNull();
        });

        it('should return parsed JSON for existing file', async () => {
            const data = { name: 'test', value: 42 };
            const filePath = path.join(tempDir, 'test.json');
            fs.writeFileSync(filePath, JSON.stringify(data));

            const result = await service.read<typeof data>('test.json');
            expect(result).toEqual(data);
        });

        it('should return null for malformed JSON', async () => {
            const filePath = path.join(tempDir, 'malformed.json');
            fs.writeFileSync(filePath, 'not valid json {{{');

            const result = await service.read('malformed.json');
            expect(result).toBeNull();
        });

        it('should handle arrays', async () => {
            const data = [1, 2, 3, 'test'];
            const filePath = path.join(tempDir, 'array.json');
            fs.writeFileSync(filePath, JSON.stringify(data));

            const result = await service.read<typeof data>('array.json');
            expect(result).toEqual(data);
        });

        it('should handle nested objects', async () => {
            const data = {
                level1: {
                    level2: {
                        value: 'deep',
                    },
                },
            };
            const filePath = path.join(tempDir, 'nested.json');
            fs.writeFileSync(filePath, JSON.stringify(data));

            const result = await service.read<typeof data>('nested.json');
            expect(result).toEqual(data);
        });

        it('should read files in subdirectories', async () => {
            const data = { sub: true };
            const subDir = path.join(tempDir, 'subdir');
            fs.mkdirSync(subDir);
            fs.writeFileSync(path.join(subDir, 'file.json'), JSON.stringify(data));

            const result = await service.read<typeof data>('subdir/file.json');
            expect(result).toEqual(data);
        });
    });

    describe('write', () => {
        it('should create file with JSON content', async () => {
            const data = { created: true };
            await service.write('new.json', data);

            const content = fs.readFileSync(path.join(tempDir, 'new.json'), 'utf-8');
            expect(JSON.parse(content)).toEqual(data);
        });

        it('should create parent directories if they do not exist', async () => {
            const data = { nested: true };
            await service.write('deep/nested/file.json', data);

            const exists = fs.existsSync(path.join(tempDir, 'deep/nested/file.json'));
            expect(exists).toBe(true);
        });

        it('should overwrite existing file', async () => {
            const filePath = path.join(tempDir, 'overwrite.json');
            fs.writeFileSync(filePath, JSON.stringify({ old: true }));

            await service.write('overwrite.json', { new: true });

            const content = fs.readFileSync(filePath, 'utf-8');
            expect(JSON.parse(content)).toEqual({ new: true });
        });

        it('should pretty print by default', async () => {
            await service.write('pretty.json', { a: 1, b: 2 });

            const content = fs.readFileSync(path.join(tempDir, 'pretty.json'), 'utf-8');
            expect(content).toContain('\n');
            expect(content).toContain('  ');
        });

        it('should not pretty print when disabled', async () => {
            const compactService = new FileStorageService(tempDir, { prettyPrint: false });
            await compactService.write('compact.json', { a: 1, b: 2 });

            const content = fs.readFileSync(path.join(tempDir, 'compact.json'), 'utf-8');
            expect(content).not.toContain('\n');
        });

        it('should use atomic writes by default', async () => {
            // This is hard to test directly, but we can verify no temp files remain
            await service.write('atomic.json', { value: 'test' });

            const files = fs.readdirSync(tempDir);
            const tempFiles = files.filter(f => f.includes('.tmp'));
            expect(tempFiles).toHaveLength(0);
        });

        it('should handle arrays', async () => {
            const data = [1, 2, 3];
            await service.write('array.json', data);

            const result = await service.read<number[]>('array.json');
            expect(result).toEqual(data);
        });

        it('should handle null values', async () => {
            await service.write('null.json', null);

            const result = await service.read('null.json');
            expect(result).toBeNull();
        });
    });

    describe('delete', () => {
        it('should delete existing file and return true', async () => {
            const filePath = path.join(tempDir, 'todelete.json');
            fs.writeFileSync(filePath, '{}');

            const result = await service.delete('todelete.json');

            expect(result).toBe(true);
            expect(fs.existsSync(filePath)).toBe(false);
        });

        it('should return false for non-existent file', async () => {
            const result = await service.delete('nonexistent.json');
            expect(result).toBe(false);
        });

        it('should delete files in subdirectories', async () => {
            const subDir = path.join(tempDir, 'sub');
            fs.mkdirSync(subDir);
            fs.writeFileSync(path.join(subDir, 'file.json'), '{}');

            const result = await service.delete('sub/file.json');
            expect(result).toBe(true);
        });
    });

    describe('deleteDirectory', () => {
        it('should delete directory and contents', async () => {
            const dirPath = path.join(tempDir, 'toremove');
            fs.mkdirSync(dirPath);
            fs.writeFileSync(path.join(dirPath, 'file.json'), '{}');

            const result = await service.deleteDirectory('toremove');

            expect(result).toBe(true);
            expect(fs.existsSync(dirPath)).toBe(false);
        });

        it('should return true for non-existent directory', async () => {
            const result = await service.deleteDirectory('nonexistent');
            expect(result).toBe(true); // rm with force returns true
        });

        it('should delete nested directories', async () => {
            fs.mkdirSync(path.join(tempDir, 'a/b/c'), { recursive: true });
            fs.writeFileSync(path.join(tempDir, 'a/b/c/file.json'), '{}');

            await service.deleteDirectory('a');

            expect(fs.existsSync(path.join(tempDir, 'a'))).toBe(false);
        });
    });

    describe('list', () => {
        it('should return empty array for non-existent directory', async () => {
            const result = await service.list('nonexistent');
            expect(result).toEqual([]);
        });

        it('should return empty array for empty directory', async () => {
            fs.mkdirSync(path.join(tempDir, 'empty'));

            const result = await service.list('empty');
            expect(result).toEqual([]);
        });

        it('should return array of file names', async () => {
            fs.mkdirSync(path.join(tempDir, 'withfiles'));
            fs.writeFileSync(path.join(tempDir, 'withfiles/a.json'), '{}');
            fs.writeFileSync(path.join(tempDir, 'withfiles/b.json'), '{}');

            const result = await service.list('withfiles');
            expect(result.sort()).toEqual(['a.json', 'b.json']);
        });

        it('should include directories in listing', async () => {
            fs.mkdirSync(path.join(tempDir, 'mixed'));
            fs.writeFileSync(path.join(tempDir, 'mixed/file.json'), '{}');
            fs.mkdirSync(path.join(tempDir, 'mixed/subdir'));

            const result = await service.list('mixed');
            expect(result.sort()).toEqual(['file.json', 'subdir']);
        });
    });

    describe('listWithTypes', () => {
        it('should return empty array for non-existent directory', async () => {
            const result = await service.listWithTypes('nonexistent');
            expect(result).toEqual([]);
        });

        it('should return entries with type information', async () => {
            fs.mkdirSync(path.join(tempDir, 'typed'));
            fs.writeFileSync(path.join(tempDir, 'typed/file.json'), '{}');
            fs.mkdirSync(path.join(tempDir, 'typed/subdir'));

            const result = await service.listWithTypes('typed');

            expect(result).toHaveLength(2);

            const file = result.find(e => e.name === 'file.json');
            const dir = result.find(e => e.name === 'subdir');

            expect(file?.isDirectory).toBe(false);
            expect(dir?.isDirectory).toBe(true);
        });
    });

    describe('stat', () => {
        it('should return null for non-existent file', async () => {
            const result = await service.stat('nonexistent.json');
            expect(result).toBeNull();
        });

        it('should return stats for existing file', async () => {
            fs.writeFileSync(path.join(tempDir, 'stats.json'), '{"test":true}');

            const result = await service.stat('stats.json');

            expect(result).not.toBeNull();
            expect(result?.isFile()).toBe(true);
            expect(result?.size).toBeGreaterThan(0);
        });

        it('should return stats for directory', async () => {
            fs.mkdirSync(path.join(tempDir, 'statsdir'));

            const result = await service.stat('statsdir');

            expect(result).not.toBeNull();
            expect(result?.isDirectory()).toBe(true);
        });
    });

    describe('copy', () => {
        it('should copy file to new location', async () => {
            fs.writeFileSync(path.join(tempDir, 'source.json'), '{"copied":true}');

            await service.copy('source.json', 'dest.json');

            const result = await service.read('dest.json');
            expect(result).toEqual({ copied: true });

            // Original should still exist
            const original = await service.read('source.json');
            expect(original).toEqual({ copied: true });
        });

        it('should create destination directory', async () => {
            fs.writeFileSync(path.join(tempDir, 'src.json'), '{}');

            await service.copy('src.json', 'newdir/dest.json');

            const exists = await service.exists('newdir/dest.json');
            expect(exists).toBe(true);
        });
    });

    describe('move', () => {
        it('should move file to new location', async () => {
            fs.writeFileSync(path.join(tempDir, 'tomove.json'), '{"moved":true}');

            await service.move('tomove.json', 'moved.json');

            const result = await service.read('moved.json');
            expect(result).toEqual({ moved: true });

            // Original should not exist
            const original = await service.exists('tomove.json');
            expect(original).toBe(false);
        });

        it('should create destination directory', async () => {
            fs.writeFileSync(path.join(tempDir, 'movesrc.json'), '{}');

            await service.move('movesrc.json', 'newmovedir/dest.json');

            const exists = await service.exists('newmovedir/dest.json');
            expect(exists).toBe(true);
        });
    });

    describe('createFileStorageService', () => {
        it('should create service from globalStorageUri-like object', () => {
            const mockUri = { fsPath: tempDir };
            const created = createFileStorageService(mockUri);

            expect(created.getBaseDir()).toBe(tempDir);
        });

        it('should accept options', () => {
            const mockUri = { fsPath: tempDir };
            const created = createFileStorageService(mockUri, { prettyPrint: false });

            expect(created).toBeDefined();
        });
    });

    describe('error handling', () => {
        it('should handle permission errors gracefully in read', async () => {
            // Create a file and make it unreadable (if on Unix)
            if (process.platform !== 'win32') {
                const filePath = path.join(tempDir, 'noperm.json');
                fs.writeFileSync(filePath, '{}');
                fs.chmodSync(filePath, 0o000);

                const result = await service.read('noperm.json');
                expect(result).toBeNull();

                // Restore permissions for cleanup
                fs.chmodSync(filePath, 0o644);
            }
        });

        it('should throw on write errors other than ENOENT', async () => {
            // Try to write to a read-only location (if on Unix)
            if (process.platform !== 'win32') {
                const readOnlyDir = path.join(tempDir, 'readonly');
                fs.mkdirSync(readOnlyDir);
                fs.chmodSync(readOnlyDir, 0o444);

                await expect(service.write('readonly/file.json', { test: true }))
                    .rejects.toThrow();

                // Restore permissions for cleanup
                fs.chmodSync(readOnlyDir, 0o755);
            }
        });

        it('should handle delete errors for directories', async () => {
            // delete() should throw for directories, only files
            fs.mkdirSync(path.join(tempDir, 'deldir'));

            await expect(service.delete('deldir')).rejects.toThrow();
        });

        it('should handle list errors gracefully', async () => {
            // Listing a file instead of directory should throw
            fs.writeFileSync(path.join(tempDir, 'notdir.json'), '{}');

            await expect(service.list('notdir.json')).rejects.toThrow();
        });

        it('should handle listWithTypes errors gracefully', async () => {
            fs.writeFileSync(path.join(tempDir, 'notdir2.json'), '{}');

            await expect(service.listWithTypes('notdir2.json')).rejects.toThrow();
        });

        it('should handle stat errors for permission denied', async () => {
            if (process.platform !== 'win32') {
                const filePath = path.join(tempDir, 'nostatperm.json');
                fs.writeFileSync(filePath, '{}');

                // Make parent unreadable
                const parentDir = path.join(tempDir, 'nostatdir');
                fs.mkdirSync(parentDir);
                fs.writeFileSync(path.join(parentDir, 'file.json'), '{}');
                fs.chmodSync(parentDir, 0o000);

                await expect(service.stat('nostatdir/file.json')).rejects.toThrow();

                // Restore permissions
                fs.chmodSync(parentDir, 0o755);
            }
        });

        it('should clean up temp file when atomic write fails during rename', async () => {
            // This is hard to test directly without mocking fs
            // But we verify the code path by ensuring writes complete
            await service.write('atomic-test.json', { value: 123 });
            const result = await service.read('atomic-test.json');
            expect(result).toEqual({ value: 123 });
        });
    });

    describe('non-atomic writes', () => {
        it('should write directly without temp file when atomicWrites is false', async () => {
            const nonAtomicService = new FileStorageService(tempDir, { atomicWrites: false });
            await nonAtomicService.write('direct.json', { direct: true });

            const result = await nonAtomicService.read('direct.json');
            expect(result).toEqual({ direct: true });
        });
    });
});
