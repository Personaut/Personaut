/**
 * BuildingWorkflowHandler manages the building workflow orchestration.
 * 
 * Responsibilities:
 * - Screen-based build workflow
 * - Persona feedback workflow  
 * - Per-screen dev server lifecycle
 * - Build state management and persistence
 * 
 * This handler was extracted from BuildModeHandler as part of the refactoring
 * to reduce the main handler's size and improve maintainability.
 * 
 * @see BuildModeHandler for the main message router
 */

import { WebviewMessage } from '../../../shared/types/CommonTypes';
import { BuildModeService } from '../services/BuildModeService';
import { StageManager } from '../services/StageManager';
import { ErrorSanitizer } from '../../../shared/services/ErrorSanitizer';

export class BuildingWorkflowHandler {
    constructor(
        private readonly _buildModeService: BuildModeService,
        private readonly stageManager: StageManager,
        _errorSanitizer: ErrorSanitizer // Available for future use but not stored
    ) { }

    /**
     * Validate project name to prevent path traversal attacks.
     * @throws Error if project name is invalid or contains path traversal characters
     */
    private validateProjectName(projectName: string): void {
        if (!projectName || typeof projectName !== 'string') {
            throw new Error('Invalid project name');
        }

        // Check for path traversal attempts
        if (projectName.includes('..') || projectName.includes('/') || projectName.includes('\\')) {
            throw new Error('Project name contains invalid characters');
        }

        // Check for other suspicious patterns
        if (projectName.startsWith('.') || projectName.includes('~')) {
            throw new Error('Project name contains invalid characters');
        }
    }

    /**
     * Send a build log message to the webview UI and persist to disk
     */
    private async logBuildMessage(
        webview: any,
        projectName: string,
        message: string,
        level: 'info' | 'success' | 'warning' | 'error' = 'info'
    ): Promise<void> {
        console.log(`[BuildingWorkflowHandler] ${message}`);

        // Send to webview
        webview.postMessage({
            type: 'build-log',
            projectName,
            message,
            level,
        });

        // Persist to disk so logs survive webview reloads
        try {
            await this._buildModeService.appendLogEntry(projectName, {
                timestamp: Date.now(),
                type: level === 'error' ? 'error' : 'system',
                stage: 'building',
                content: message,
            });
        } catch (error) {
            console.error('[BuildingWorkflowHandler] Failed to persist log entry:', error);
        }
    }

    /**
     * Handle initialize building stage request.
     * Creates the building folder and initializes framework if needed.
     */
    async handleInitializeBuilding(message: WebviewMessage, webview: any): Promise<void> {
        const { projectName, framework, screens, codeFolderName } = message;

        if (!projectName) {
            throw new Error('Project name is required');
        }

        this.validateProjectName(projectName);

        console.log('[BuildingWorkflowHandler] Initializing building stage:', {
            projectName,
            framework: framework || 'react',
            screenCount: screens?.length || 0,
            codeFolderName: codeFolderName || '(workspace root)',
        });

        try {
            // Step 1: Create build folder with page subfolders
            webview.postMessage({
                type: 'building-init-progress',
                step: 'folder',
                status: 'running',
                message: 'Creating build folder and page directories...',
            });

            // Extract page names from screens
            const pageNames = (screens || []).map((s: any) => s.name || `Page ${screens.indexOf(s) + 1}`);
            const buildFolderPath = await this.stageManager.createBuildFolder(projectName, pageNames);

            webview.postMessage({
                type: 'building-init-progress',
                step: 'folder',
                status: 'complete',
                message: `Build folder created with ${pageNames.length} page directories`,
                path: buildFolderPath,
            });

            // Step 2: Determine project path (workspace root or subdirectory)
            const workspacePath = await this.stageManager.getWorkspacePath();
            const fs = await import('fs');
            const path = await import('path');

            // If codeFolderName is provided, create that subdirectory
            let projectPath = workspacePath;
            if (codeFolderName && codeFolderName.trim()) {
                projectPath = path.join(workspacePath, codeFolderName.trim());

                // Create the project subdirectory if it doesn't exist
                if (!fs.existsSync(projectPath)) {
                    await fs.promises.mkdir(projectPath, { recursive: true });
                    webview.postMessage({
                        type: 'building-init-progress',
                        step: 'folder',
                        status: 'complete',
                        message: `Created code folder: ${codeFolderName}/`,
                    });
                }
            }

            // Step 3: Check if framework is already initialized in the project path
            webview.postMessage({
                type: 'building-init-progress',
                step: 'framework-check',
                status: 'running',
                message: 'Checking framework initialization...',
            });

            const packageJsonPath = path.join(projectPath, 'package.json');
            const frameworkInitialized = fs.existsSync(packageJsonPath);

            if (frameworkInitialized) {
                // Framework already set up
                webview.postMessage({
                    type: 'building-init-progress',
                    step: 'framework-check',
                    status: 'complete',
                    message: 'Framework already initialized',
                    frameworkReady: true,
                });
            } else {
                // No package.json - initialize framework
                webview.postMessage({
                    type: 'building-init-progress',
                    step: 'framework-init',
                    status: 'running',
                    message: `Initializing ${framework || 'React'} project with Vite...`,
                });

                // Get framework init command - run in project subdirectory if specified
                const initCommand = this.getFrameworkInitCommand(framework || 'react', projectPath);

                if (initCommand) {
                    // Execute framework initialization
                    const { exec } = await import('child_process');
                    const util = await import('util');
                    const execPromise = util.promisify(exec);

                    try {
                        webview.postMessage({
                            type: 'building-init-progress',
                            step: 'framework-init',
                            status: 'running',
                            message: `Running: ${initCommand.command}`,
                        });

                        await execPromise(initCommand.command, {
                            cwd: initCommand.cwd,
                            timeout: 180000, // 3 minute timeout (some inits are slow)
                        });

                        webview.postMessage({
                            type: 'building-init-progress',
                            step: 'framework-init',
                            status: 'complete',
                            message: `${framework || 'React'} project initialized successfully`,
                            frameworkReady: true,
                        });
                        // Dev server will be started just-in-time during screenshot capture
                    } catch (initError: any) {
                        console.error('[BuildingWorkflowHandler] Framework init failed:', initError.message?.split('\\n')[0] || initError);
                        webview.postMessage({
                            type: 'building-init-progress',
                            step: 'framework-init',
                            status: 'skipped', // Use skipped instead of error to not block
                            message: `Auto-init skipped. Please set up your ${framework || 'React'} project manually.`,
                            frameworkReady: false,
                        });
                    }
                } else {
                    webview.postMessage({
                        type: 'building-init-progress',
                        step: 'framework-init',
                        status: 'skipped',
                        message: 'No auto-initialization for this framework. Please set up manually.',
                        frameworkReady: false,
                    });
                }
            }

            // Dev server will be started just-in-time during screenshot capture (no long-running process)

            // Step 4: Initialize page tracking
            const pageStates = (screens || []).map((screen: any, idx: number) => ({
                id: screen.id || `page-${idx + 1}`,
                name: screen.name || `Page ${idx + 1}`,
                status: idx === 0 ? 'pending' : 'locked', // First page is pending, rest are locked
                currentIteration: 0,
                maxIterations: 5,
                history: [],
            }));

            webview.postMessage({
                type: 'building-initialized',
                projectName,
                buildFolderPath,
                codeFolderName: codeFolderName || null,
                pages: pageStates,
                framework: framework || 'react',
            });

            console.log('[BuildingWorkflowHandler] Building stage initialized successfully');

        } catch (error: any) {
            console.error('[BuildingWorkflowHandler] Failed to initialize building stage:', error);
            webview.postMessage({
                type: 'building-init-error',
                error: error.message || 'Failed to initialize building stage',
            });
        }
    }

    /**
     * Get the framework initialization command based on selected framework.
     * Uses modern Vite-based tooling for React/Vue.
     * @private
     */
    private getFrameworkInitCommand(framework: string, workspacePath: string): { command: string; cwd: string } | null {
        // Use Vite for modern React/Vue projects
        const commands: Record<string, string | null> = {
            'react': 'npm create vite@latest . -- --template react-ts',
            'nextjs': 'npx -y create-next-app@latest . --typescript --eslint --tailwind --app --src-dir --import-alias "@/*" --use-npm',
            'vue': 'npm create vite@latest . -- --template vue-ts',
            'flutter': 'flutter create .',
            'html': null, // No init needed for plain HTML
        };

        const command = commands[framework.toLowerCase()];
        if (!command) {
            return null;
        }

        return { command, cwd: workspacePath };
    }

    /**
     * Handle resume building workflow request (Task 21.11)
     */
    async handleResumeBuildingWorkflow(
        message: WebviewMessage,
        webview: any
    ): Promise<void> {
        const { projectName, iterationNumber, userStory, framework: _framework, personas: _personas } = message;
        if (!projectName) {
            throw new Error('Project name is required to resume workflow');
        }

        console.log(`[BuildingWorkflowHandler] Resuming building workflow for: ${projectName}`);

        // Load the saved workflow state
        const iterationData = await this.stageManager.loadIterationData(
            projectName,
            iterationNumber || 1
        );

        // Check if we have paused state (consolidatedFeedback contains "Workflow Paused")
        const isPaused = iterationData?.consolidatedFeedback?.includes('# Workflow Paused');

        if (!isPaused) {
            webview.postMessage({
                type: 'building-workflow-error',
                error: 'No paused workflow found to resume',
                projectName,
            });
            return;
        }

        webview.postMessage({
            type: 'building-workflow-resumed',
            projectName,
            iterationNumber: iterationNumber || 1,
        });

        // Restart the workflow if we have the user story
        if (userStory) {
            await this.handleStartBuildingWorkflow(
                { ...message, type: 'start-building-workflow' },
                webview
            );
        }

        console.log(`[BuildingWorkflowHandler] Building workflow resumed for: ${projectName}`);
    }

    /**
     * Handle start building workflow request (Task 21)
     * Validates: Requirements 12.2, 12.3, 12.4, 12.5, 12.6, 12.7
     * 
     * This implements a UX-driven iterative workflow where:
     * 1. UX Agent creates specification based on user stories, features, and feedback
     * 2. Developer Agent implements the UX specification
     * 3. Screenshot is captured
     * 4. Personas provide feedback and ratings
     * 5. If rating >= 8.5, present to user for approval
     * 6. If rating < 8.5, auto-iterate with feedback
     * 7. User can approve or request another iteration
     * 8. Process repeats for each page
     */
    async handleStartBuildingWorkflow(message: WebviewMessage, webview: any): Promise<void> {
        const { projectName, screens, framework, personas } = message;

        if (!projectName || !screens || screens.length === 0) {
            throw new Error('Project name and screens are required');
        }

        this.validateProjectName(projectName);

        await this.logBuildMessage(webview, projectName, `🚀 Starting build workflow for ${projectName}...`, 'info');
        console.log('[BuildingWorkflowHandler] Starting UX-driven building workflow:', {
            projectName,
            framework: framework || 'react',
            screenCount: screens.length,
            personaCount: personas?.length || 0,
        });

        // Notify start
        webview.postMessage({
            type: 'building-workflow-started',
            projectName,
            totalPages: screens.length,
        });

        try {
            // Phase 1: Initialize project (one-time)
            await this.initializeProject(projectName, framework || 'react', screens, webview);

            // Phase 2: Process each page iteratively
            for (let pageIndex = 0; pageIndex < screens.length; pageIndex++) {
                const screen = screens[pageIndex];
                let approved = false;
                let iteration = 1;
                const maxIterations = 10; // Safety limit
                let previousFeedback: string | null = null;

                webview.postMessage({
                    type: 'page-started',
                    projectName,
                    pageIndex,
                    pageName: screen.name,
                    totalPages: screens.length,
                });

                // Iteration loop for current page
                while (!approved && iteration <= maxIterations) {
                    await this.logBuildMessage(webview, projectName, `📄 ${screen.name} - Iteration ${iteration}/${maxIterations}`, 'info');
                    console.log(`[BuildingWorkflowHandler] Page ${screen.name} - Iteration ${iteration}`);

                    // Step 1: UX Agent creates specification
                    const uxSpec = await this.createUXSpecification(
                        screen,
                        framework || 'react',
                        previousFeedback,
                        iteration,
                        webview,
                        projectName
                    );

                    // Step 2: Developer Agent implements
                    await this.implementCode(
                        screen,
                        uxSpec,
                        framework || 'react',
                        iteration,
                        webview,
                        projectName
                    );

                    // Step 3: Capture screenshot
                    const screenshot = await this.captureScreenshot(
                        screen,
                        framework || 'react',
                        iteration,
                        webview,
                        projectName
                    );

                    // Step 4: Collect persona feedback
                    const feedback = await this.collectFeedback(
                        screen,
                        screenshot,
                        personas || [],
                        iteration,
                        webview,
                        projectName
                    );

                    // Step 5: Decision logic
                    const decision = this.decideNextAction(feedback.averageRating, iteration, maxIterations);

                    if (decision === 'present-to-user') {
                        // Rating >= 8.5 - present to user
                        webview.postMessage({
                            type: 'user-decision-needed',
                            projectName,
                            pageName: screen.name,
                            iteration,
                            rating: feedback.averageRating,
                            feedback: feedback.consolidatedFeedback,
                            screenshot,
                        });

                        // Wait for user decision (handled by separate message handler)
                        // For now, we'll auto-approve if rating is good
                        approved = true;

                    } else if (decision === 'auto-iterate') {
                        // Rating < 8.5 - auto-iterate
                        previousFeedback = feedback.consolidatedFeedback;
                        iteration++;

                        webview.postMessage({
                            type: 'auto-iterating',
                            projectName,
                            pageName: screen.name,
                            iteration: iteration - 1,
                            nextIteration: iteration,
                            rating: feedback.averageRating,
                            reason: 'Rating below 8.5 threshold',
                        });

                    } else {
                        // Max iterations reached
                        webview.postMessage({
                            type: 'max-iterations-reached',
                            projectName,
                            pageName: screen.name,
                            iteration,
                            rating: feedback.averageRating,
                        });
                        approved = true; // Force approval to move on
                    }
                }

                // Page complete
                webview.postMessage({
                    type: 'page-complete',
                    projectName,
                    pageName: screen.name,
                    finalIteration: iteration,
                    pageIndex,
                    totalPages: screens.length,
                });
            }

            // All pages complete
            webview.postMessage({
                type: 'building-workflow-complete',
                projectName,
                totalPages: screens.length,
            });

            await this.logBuildMessage(webview, projectName, '✅ Build workflow completed successfully!', 'success');
            console.log('[BuildingWorkflowHandler] Building workflow completed successfully');

        } catch (error: any) {
            console.error('[BuildingWorkflowHandler] Building workflow failed:', error);
            webview.postMessage({
                type: 'building-workflow-error',
                projectName,
                error: error.message || 'Building workflow failed',
            });
        }
    }

    /**
     * Initialize project structure and dependencies
     */
    private async initializeProject(
        projectName: string,
        framework: string,
        _screens: any[],
        webview: any
    ): Promise<void> {
        await this.logBuildMessage(webview, projectName, '📁 Initializing project structure...', 'info');
        console.log('[BuildingWorkflowHandler] Initializing project...');

        webview.postMessage({
            type: 'project-init-started',
            projectName,
            framework,
        });

        // Create project directory structure
        const fs = await import('fs/promises');
        const path = await import('path');

        const projectPath = path.join('/Users/anthony/testing', projectName);
        const srcPath = path.join(projectPath, 'src');
        const pagesPath = path.join(srcPath, 'pages');

        await fs.mkdir(pagesPath, { recursive: true });

        // Generate package.json
        const { PackageJsonGenerator } = await import('../services/PackageJsonGenerator');
        const packageGenerator = new PackageJsonGenerator();
        const packageJson = packageGenerator.generate({
            projectName,
            framework: framework as any,
            description: `${projectName} - Generated by Personaut Build Mode`,
        });

        await fs.writeFile(
            path.join(projectPath, 'package.json'),
            packageGenerator.stringify(packageJson),
            'utf-8'
        );

        webview.postMessage({
            type: 'project-init-progress',
            step: 'package-json',
            status: 'complete',
        });

        // Install dependencies
        const { DependencyInstaller } = await import('../services/DependencyInstaller');
        const installer = new DependencyInstaller();

        await installer.install({
            projectPath,
            onProgress: (message) => {
                webview.postMessage({
                    type: 'project-init-progress',
                    step: 'dependencies',
                    status: 'running',
                    message,
                });
            },
            onError: (error) => {
                console.error('[BuildingWorkflowHandler] Dependency install error:', error);
            },
        });

        webview.postMessage({
            type: 'project-init-complete',
            projectName,
            projectPath,
        });

        console.log('[BuildingWorkflowHandler] Project initialized successfully');
    }

    /**
     * UX Agent creates detailed specification
     */
    private async createUXSpecification(
        screen: any,
        _framework: string,
        previousFeedback: string | null,
        iteration: number,
        webview: any,
        projectName: string
    ): Promise<string> {
        await this.logBuildMessage(webview, projectName, `✏️ Creating UX specification for ${screen.name}...`, 'info');
        console.log(`[BuildingWorkflowHandler] Creating UX specification for ${screen.name} (iteration ${iteration})`);

        webview.postMessage({
            type: 'page-progress',
            projectName,
            pageName: screen.name,
            step: 'ux-spec',
            status: 'running',
            iteration,
        });

        // TODO: Implement UX Agent call
        // For now, return a placeholder spec
        const spec = `# UX Specification: ${screen.name}

## Overview
${screen.description || 'Page description'}

## Components
${screen.components?.map((c: any) => `- ${c.name}: ${c.description}`).join('\n') || '- Main content area'}

## Layout
- Responsive design
- Mobile-first approach

${previousFeedback ? `\n## Improvements Based on Feedback\n${previousFeedback}` : ''}
`;

        webview.postMessage({
            type: 'page-progress',
            projectName,
            pageName: screen.name,
            step: 'ux-spec',
            status: 'complete',
            iteration,
        });

        return spec;
    }

    /**
     * Developer Agent implements the UX specification
     */
    private async implementCode(
        screen: any,
        _uxSpec: string,
        _framework: string,
        iteration: number,
        webview: any,
        projectName: string
    ): Promise<void> {
        await this.logBuildMessage(webview, projectName, `💻 Implementing code for ${screen.name}...`, 'info');
        console.log(`[BuildingWorkflowHandler] Implementing code for ${screen.name} (iteration ${iteration})`);

        webview.postMessage({
            type: 'page-progress',
            projectName,
            pageName: screen.name,
            step: 'development',
            status: 'running',
            iteration,
        });


        // TODO: Implement Developer Agent call
        // For now, create a placeholder file
        const fs = await import('fs/promises');
        const path = await import('path');

        const projectPath = path.join('/Users/anthony/testing', projectName);

        // Sanitize screen name for use as filename and component name
        // Convert "Home Feed / Discover" -> "HomeFeedDiscover"
        const sanitizedName = screen.name
            .replace(/[^a-zA-Z0-9]+/g, '') // Remove all non-alphanumeric characters
            .replace(/^[0-9]/, '_$&');      // Prefix with _ if starts with number

        const filePath = path.join(projectPath, 'src', 'pages', `${sanitizedName}.tsx`);

        const code = `// ${screen.name} - Iteration ${iteration}
// Generated from UX Specification

export default function ${sanitizedName}() {
  return (
    <div>
      <h1>${screen.name}</h1>
      <p>${screen.description || 'Page content'}</p>
    </div>
  );
}
`;

        // Ensure directory exists
        await fs.mkdir(path.dirname(filePath), { recursive: true });

        await fs.writeFile(filePath, code, 'utf-8');

        webview.postMessage({
            type: 'page-progress',
            projectName,
            pageName: screen.name,
            step: 'development',
            status: 'complete',
            iteration,
        });
    }

    /**
     * Capture screenshot of the implemented page
     */
    private async captureScreenshot(
        screen: any,
        _framework: string,
        iteration: number,
        webview: any,
        projectName: string
    ): Promise<string> {
        await this.logBuildMessage(webview, projectName, `📸 Capturing screenshot for ${screen.name}...`, 'info');
        console.log(`[BuildingWorkflowHandler] Capturing screenshot for ${screen.name} (iteration ${iteration})`);

        webview.postMessage({
            type: 'page-progress',
            projectName,
            pageName: screen.name,
            step: 'screenshot',
            status: 'running',
            iteration,
        });

        // TODO: Implement actual screenshot capture with Puppeteer
        // For now, return a placeholder
        const screenshot = 'data:image/png;base64,placeholder';

        webview.postMessage({
            type: 'page-progress',
            projectName,
            pageName: screen.name,
            step: 'screenshot',
            status: 'complete',
            iteration,
        });

        return screenshot;
    }

    /**
     * Collect feedback from personas
     */
    private async collectFeedback(
        screen: any,
        _screenshot: string,
        _personas: any[],
        iteration: number,
        webview: any,
        projectName: string
    ): Promise<{ averageRating: number; consolidatedFeedback: string }> {
        await this.logBuildMessage(webview, projectName, `💬 Collecting feedback for ${screen.name}...`, 'info');
        console.log(`[BuildingWorkflowHandler] Collecting feedback for ${screen.name} (iteration ${iteration})`);

        webview.postMessage({
            type: 'page-progress',
            projectName,
            pageName: screen.name,
            step: 'feedback',
            status: 'running',
            iteration,
        });

        // TODO: Implement Reviewer Agent calls for each persona
        // For now, return mock feedback
        const mockRating = iteration === 1 ? 7.5 : 8.8; // Improve on second iteration

        const feedback = {
            averageRating: mockRating,
            consolidatedFeedback: iteration === 1
                ? 'Good start, but needs better spacing and more prominent CTA'
                : 'Excellent! Spacing is much better and CTA stands out',
        };

        webview.postMessage({
            type: 'page-progress',
            projectName,
            pageName: screen.name,
            step: 'feedback',
            status: 'complete',
            iteration,
            rating: feedback.averageRating,
        });

        return feedback;
    }

    /**
     * Decide next action based on rating and iteration
     */
    private decideNextAction(
        rating: number,
        iteration: number,
        maxIterations: number
    ): 'auto-iterate' | 'present-to-user' | 'max-iterations' {
        if (iteration >= maxIterations) {
            return 'max-iterations';
        }

        if (rating >= 8.5) {
            return 'present-to-user';
        }

        return 'auto-iterate';
    }
}
