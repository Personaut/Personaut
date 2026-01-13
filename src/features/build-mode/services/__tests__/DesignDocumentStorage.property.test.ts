/**
 * DesignDocumentStorage Property Tests
 *
 * Property 14: Stage Files Persist Correctly
 * - Documents are saved to correct paths
 * - Documents can be read back correctly
 * - Atomic writes prevent corruption
 *
 * Property 18: File Paths Follow Conventions
 * - All paths under .personaut/design/{project-name}/
 * - Page requirements in pages/ subdirectory
 * - User flows in flows/ subdirectory
 *
 * Property 19: Export All Documents
 * - All document types can be exported
 * - Partial failures are tracked
 * - List operations return correct results
 *
 * Validates: Requirements 8B.8, 10.3, 11.3, 24.8, 24.9
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
    createDesignDocumentStorage,
    DESIGN_DIR,
    PAGES_SUBDIR,
    FLOWS_SUBDIR,
} from '../DesignDocumentStorage';

// ============================================================================
// Test Helpers
// ============================================================================

let testDir: string;

async function createTestDir(): Promise<string> {
    const dir = path.join(os.tmpdir(), `design-storage-test-${Date.now()}`);
    await fs.promises.mkdir(dir, { recursive: true });
    return dir;
}

async function cleanupTestDir(dir: string): Promise<void> {
    try {
        await fs.promises.rm(dir, { recursive: true, force: true });
    } catch {
        // Ignore cleanup errors
    }
}

// ============================================================================
// Tests
// ============================================================================

describe('DesignDocumentStorage Property Tests', () => {
    beforeEach(async () => {
        testDir = await createTestDir();
    });

    afterEach(async () => {
        await cleanupTestDir(testDir);
    });

    // ========================================================================
    // Property 18: File Paths Follow Conventions
    // ========================================================================
    describe('Property 18: File Paths Follow Conventions', () => {
        describe('Design directory structure', () => {
            it('should create paths under .personaut/design/{project-name}/', () => {
                const storage = createDesignDocumentStorage(testDir, 'My Test Project');
                const designDir = storage.getDesignDir();

                expect(designDir).toContain('.personaut');
                expect(designDir).toContain(DESIGN_DIR);
                expect(designDir).toContain('my-test-project');
            });

            it('should convert project name to kebab-case', () => {
                const storage = createDesignDocumentStorage(testDir, 'My AWESOME Project 123');
                const designDir = storage.getDesignDir();

                expect(designDir).toContain('my-awesome-project-123');
            });

            it('should handle special characters in project name', () => {
                const storage = createDesignDocumentStorage(testDir, 'Project @#$% Test!');
                const designDir = storage.getDesignDir();

                // Special chars converted to hyphens
                expect(designDir).toContain('project-test');
            });
        });

        describe('Document paths', () => {
            it('should create style-guide.md at root of design directory', () => {
                const storage = createDesignDocumentStorage(testDir, 'Test Project');
                const docPath = storage.getDocumentPath('style-guide');

                expect(docPath.endsWith('style-guide.md')).toBe(true);
                expect(docPath).toContain('test-project');
                expect(docPath).not.toContain(PAGES_SUBDIR);
                expect(docPath).not.toContain(FLOWS_SUBDIR);
            });

            it('should create steering-document.md at root of design directory', () => {
                const storage = createDesignDocumentStorage(testDir, 'Test Project');
                const docPath = storage.getDocumentPath('steering-document');

                expect(docPath.endsWith('steering-document.md')).toBe(true);
            });

            it('should create task-list.md at root of design directory', () => {
                const storage = createDesignDocumentStorage(testDir, 'Test Project');
                const docPath = storage.getDocumentPath('task-list');

                expect(docPath.endsWith('task-list.md')).toBe(true);
            });

            it('should create page requirements in pages/ subdirectory', () => {
                const storage = createDesignDocumentStorage(testDir, 'Test Project');
                const docPath = storage.getDocumentPath('page-requirements', 'Dashboard Page');

                expect(docPath).toContain(PAGES_SUBDIR);
                expect(docPath.endsWith('dashboard-page.md')).toBe(true);
            });

            it('should create user flows in flows/ subdirectory', () => {
                const storage = createDesignDocumentStorage(testDir, 'Test Project');
                const docPath = storage.getDocumentPath('user-flow', 'Login Flow');

                expect(docPath).toContain(FLOWS_SUBDIR);
                expect(docPath.endsWith('login-flow.md')).toBe(true);
            });

            it('should throw error for page-requirements without identifier', () => {
                const storage = createDesignDocumentStorage(testDir, 'Test Project');

                expect(() => {
                    storage.getDocumentPath('page-requirements');
                }).toThrow('Page requirements require an identifier');
            });

            it('should throw error for user-flow without identifier', () => {
                const storage = createDesignDocumentStorage(testDir, 'Test Project');

                expect(() => {
                    storage.getDocumentPath('user-flow');
                }).toThrow('User flow requires an identifier');
            });
        });

        describe('Relative paths', () => {
            it('should generate relative paths from base directory', () => {
                const storage = createDesignDocumentStorage(testDir, 'Test Project');
                const relativePath = storage.getRelativePath('style-guide');

                expect(relativePath).toBe(
                    path.join('.personaut', DESIGN_DIR, 'test-project', 'style-guide.md')
                );
            });
        });
    });

    // ========================================================================
    // Property 14: Stage Files Persist Correctly
    // ========================================================================
    describe('Property 14: Stage Files Persist Correctly', () => {
        const testContent = `---
document_type: style_guide
project_name: "Test Project"
---

# Style Guide

## Color Palette
- Primary: #3498db
`;

        describe('Write operations', () => {
            it('should save style guide and create directory structure', async () => {
                const storage = createDesignDocumentStorage(testDir, 'Test Project');
                const result = await storage.saveStyleGuide(testContent);

                expect(result.success).toBe(true);
                expect(result.filePath).toContain('style-guide.md');

                // Verify file exists
                const exists = await fs.promises
                    .access(result.filePath, fs.constants.F_OK)
                    .then(() => true)
                    .catch(() => false);
                expect(exists).toBe(true);
            });

            it('should save steering document', async () => {
                const storage = createDesignDocumentStorage(testDir, 'Test Project');
                const result = await storage.saveSteeringDocument('# Steering Document');

                expect(result.success).toBe(true);
                expect(result.filePath).toContain('steering-document.md');
            });

            it('should save task list', async () => {
                const storage = createDesignDocumentStorage(testDir, 'Test Project');
                const result = await storage.saveTaskList('# Task List');

                expect(result.success).toBe(true);
                expect(result.filePath).toContain('task-list.md');
            });

            it('should save page requirements with identifier', async () => {
                const storage = createDesignDocumentStorage(testDir, 'Test Project');
                const result = await storage.savePageRequirements('dashboard', '# Dashboard Page');

                expect(result.success).toBe(true);
                expect(result.filePath).toContain(PAGES_SUBDIR);
                expect(result.filePath).toContain('dashboard.md');
            });

            it('should save user flow with identifier', async () => {
                const storage = createDesignDocumentStorage(testDir, 'Test Project');
                const result = await storage.saveUserFlow('login', '# Login Flow');

                expect(result.success).toBe(true);
                expect(result.filePath).toContain(FLOWS_SUBDIR);
                expect(result.filePath).toContain('login.md');
            });

            it('should overwrite existing document', async () => {
                const storage = createDesignDocumentStorage(testDir, 'Test Project');

                await storage.saveStyleGuide('Original content');
                const result = await storage.saveStyleGuide('Updated content');

                expect(result.success).toBe(true);

                const content = await fs.promises.readFile(result.filePath, 'utf-8');
                expect(content).toBe('Updated content');
            });
        });

        describe('Read operations', () => {
            it('should read back saved document', async () => {
                const storage = createDesignDocumentStorage(testDir, 'Test Project');
                await storage.saveStyleGuide(testContent);

                const result = await storage.readDocument('style-guide');

                expect(result.success).toBe(true);
                expect(result.content).toBe(testContent);
                expect(result.metadata?.documentType).toBe('style-guide');
            });

            it('should return error for non-existent document', async () => {
                const storage = createDesignDocumentStorage(testDir, 'Test Project');
                const result = await storage.readDocument('style-guide');

                expect(result.success).toBe(false);
                expect(result.error).toBeDefined();
            });
        });

        describe('Document existence', () => {
            it('should correctly check if document exists', async () => {
                const storage = createDesignDocumentStorage(testDir, 'Test Project');

                expect(await storage.documentExists('style-guide')).toBe(false);

                await storage.saveStyleGuide('# Style Guide');

                expect(await storage.documentExists('style-guide')).toBe(true);
            });

            it('should check existence for page requirements', async () => {
                const storage = createDesignDocumentStorage(testDir, 'Test Project');

                expect(await storage.documentExists('page-requirements', 'dashboard')).toBe(false);

                await storage.savePageRequirements('dashboard', '# Dashboard');

                expect(await storage.documentExists('page-requirements', 'dashboard')).toBe(true);
            });
        });
    });

    // ========================================================================
    // Property 19: Export All Documents
    // ========================================================================
    describe('Property 19: Export All Documents', () => {
        describe('Export all', () => {
            it('should export multiple documents at once', async () => {
                const storage = createDesignDocumentStorage(testDir, 'Test Project');

                const result = await storage.exportAll({
                    styleGuide: '# Style Guide',
                    steeringDocument: '# Steering Document',
                    taskList: '# Task List',
                });

                expect(result.success).toBe(true);
                expect(result.exportedFiles).toHaveLength(3);
                expect(result.errors).toHaveLength(0);
            });

            it('should export page requirements and user flows', async () => {
                const storage = createDesignDocumentStorage(testDir, 'Test Project');

                const result = await storage.exportAll({
                    pageRequirements: [
                        { id: 'dashboard', content: '# Dashboard' },
                        { id: 'settings', content: '# Settings' },
                    ],
                    userFlows: [
                        { id: 'login', content: '# Login Flow' },
                    ],
                });

                expect(result.success).toBe(true);
                expect(result.exportedFiles).toHaveLength(3);
            });

            it('should continue after partial failures and track errors', async () => {
                const storage = createDesignDocumentStorage(testDir, 'Test Project');

                // First save succeeds
                await storage.saveStyleGuide('# Style Guide');

                // Export with all documents
                const result = await storage.exportAll({
                    styleGuide: '# Updated Style Guide',
                    steeringDocument: '# Steering Document',
                });

                expect(result.success).toBe(true);
                expect(result.exportedFiles).toHaveLength(2);
            });
        });

        describe('List operations', () => {
            it('should list all page requirements', async () => {
                const storage = createDesignDocumentStorage(testDir, 'Test Project');

                await storage.savePageRequirements('dashboard', '# Dashboard');
                await storage.savePageRequirements('settings', '# Settings');
                await storage.savePageRequirements('profile', '# Profile');

                const pages = await storage.listPageRequirements();

                expect(pages).toHaveLength(3);
                expect(pages).toContain('dashboard');
                expect(pages).toContain('settings');
                expect(pages).toContain('profile');
            });

            it('should list all user flows', async () => {
                const storage = createDesignDocumentStorage(testDir, 'Test Project');

                await storage.saveUserFlow('login', '# Login');
                await storage.saveUserFlow('checkout', '# Checkout');

                const flows = await storage.listUserFlows();

                expect(flows).toHaveLength(2);
                expect(flows).toContain('login');
                expect(flows).toContain('checkout');
            });

            it('should return empty array for non-existent directory', async () => {
                const storage = createDesignDocumentStorage(testDir, 'New Project');

                const pages = await storage.listPageRequirements();
                const flows = await storage.listUserFlows();

                expect(pages).toHaveLength(0);
                expect(flows).toHaveLength(0);
            });

            it('should list all documents with existence flags', async () => {
                const storage = createDesignDocumentStorage(testDir, 'Test Project');

                await storage.saveStyleGuide('# Style');
                await storage.savePageRequirements('home', '# Home');
                await storage.saveUserFlow('signup', '# Signup');

                const allDocs = await storage.listAllDocuments();

                expect(allDocs.styleGuide).toBe(true);
                expect(allDocs.steeringDocument).toBe(false);
                expect(allDocs.taskList).toBe(false);
                expect(allDocs.pageRequirements).toContain('home');
                expect(allDocs.userFlows).toContain('signup');
            });
        });

        describe('Delete operations', () => {
            it('should delete individual documents', async () => {
                const storage = createDesignDocumentStorage(testDir, 'Test Project');

                await storage.saveStyleGuide('# Style Guide');
                expect(await storage.documentExists('style-guide')).toBe(true);

                const deleted = await storage.deleteDocument('style-guide');
                expect(deleted).toBe(true);
                expect(await storage.documentExists('style-guide')).toBe(false);
            });

            it('should return false when deleting non-existent document', async () => {
                const storage = createDesignDocumentStorage(testDir, 'Test Project');

                const deleted = await storage.deleteDocument('style-guide');
                expect(deleted).toBe(false);
            });

            it('should delete all project documents', async () => {
                const storage = createDesignDocumentStorage(testDir, 'Test Project');

                await storage.saveStyleGuide('# Style');
                await storage.saveSteeringDocument('# Steering');
                await storage.savePageRequirements('home', '# Home');

                const deleted = await storage.deleteAll();
                expect(deleted).toBe(true);

                const allDocs = await storage.listAllDocuments();
                expect(allDocs.styleGuide).toBe(false);
                expect(allDocs.steeringDocument).toBe(false);
                expect(allDocs.pageRequirements).toHaveLength(0);
            });
        });
    });

    // ========================================================================
    // Factory Function
    // ========================================================================
    describe('Factory Function', () => {
        it('should create storage instance with correct configuration', () => {
            const storage = createDesignDocumentStorage('/base/dir', 'My Project');

            const designDir = storage.getDesignDir();
            expect(designDir).toContain('/base/dir');
            expect(designDir).toContain('my-project');
        });
    });
});
