/**
 * Project Initialization Service
 * Handles creating project folders and initializing frameworks
 */

import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ProjectInitOptions {
    projectName: string;
    framework: 'react' | 'nextjs' | 'vue' | 'html';
    baseDirectory: string; // Where to create the project
}

export interface ProjectInitResult {
    success: boolean;
    projectPath: string;
    error?: string;
}

export class ProjectInitializationService {
    /**
     * Initialize a new project with the specified framework
     */
    async initializeProject(options: ProjectInitOptions): Promise<ProjectInitResult> {
        const { projectName, framework, baseDirectory } = options;
        const projectPath = path.join(baseDirectory, projectName);

        try {
            // Step 1: Create project directory
            await this.createProjectDirectory(projectPath);

            // Step 2: Initialize framework
            await this.initializeFramework(projectPath, projectName, framework);

            return {
                success: true,
                projectPath,
            };
        } catch (error: any) {
            return {
                success: false,
                projectPath,
                error: error.message,
            };
        }
    }

    /**
     * Create the project directory
     */
    private async createProjectDirectory(projectPath: string): Promise<void> {
        if (fs.existsSync(projectPath)) {
            throw new Error(`Project directory already exists: ${projectPath}`);
        }

        await fs.promises.mkdir(projectPath, { recursive: true });
    }

    /**
     * Initialize the framework in the project directory
     */
    private async initializeFramework(
        projectPath: string,
        projectName: string,
        framework: string
    ): Promise<void> {
        const command = this.getInitCommand(projectName, framework);
        const parentDir = path.dirname(projectPath);

        console.log(`[ProjectInit] Running: ${command} in ${parentDir}`);

        try {
            const { stdout, stderr } = await execAsync(command, {
                cwd: parentDir,
                timeout: 300000, // 5 minutes timeout
            });

            if (stderr && !stderr.includes('npm WARN')) {
                console.warn(`[ProjectInit] stderr: ${stderr}`);
            }

            console.log(`[ProjectInit] stdout: ${stdout}`);
        } catch (error: any) {
            throw new Error(`Framework initialization failed: ${error.message}`);
        }
    }

    /**
     * Get the initialization command for the framework
     */
    private getInitCommand(projectName: string, framework: string): string {
        switch (framework.toLowerCase()) {
            case 'react':
                return `npx -y create-react-app ${projectName}`;

            case 'nextjs':
                return `npx -y create-next-app@latest ${projectName} --typescript --tailwind --app --no-src-dir --import-alias "@/*"`;

            case 'vue':
                return `npx -y create-vue@latest ${projectName} --typescript --jsx --router --pinia`;

            case 'html':
                // For HTML, we'll create a simple structure manually
                return `mkdir -p ${projectName} && cd ${projectName} && echo "<!DOCTYPE html><html><head><title>${projectName}</title></head><body><div id='app'></div></body></html>" > index.html`;

            default:
                throw new Error(`Unsupported framework: ${framework}`);
        }
    }

    /**
     * Check if a project already exists
     */
    projectExists(projectPath: string): boolean {
        return fs.existsSync(projectPath);
    }

    /**
     * Get the project path
     */
    getProjectPath(baseDirectory: string, projectName: string): string {
        return path.join(baseDirectory, projectName);
    }

    /**
     * Validate project name (no special characters, no path traversal)
     */
    validateProjectName(projectName: string): { valid: boolean; error?: string } {
        if (!projectName || projectName.trim().length === 0) {
            return { valid: false, error: 'Project name cannot be empty' };
        }

        if (projectName.includes('/') || projectName.includes('\\')) {
            return { valid: false, error: 'Project name cannot contain path separators' };
        }

        if (projectName.includes('..')) {
            return { valid: false, error: 'Project name cannot contain ..' };
        }

        if (!/^[a-zA-Z0-9-_]+$/.test(projectName)) {
            return { valid: false, error: 'Project name can only contain letters, numbers, hyphens, and underscores' };
        }

        return { valid: true };
    }
}
