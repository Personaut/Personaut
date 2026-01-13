/**
 * WorkflowOrchestratorHandler - Handles BuildWorkflowOrchestrator operations
 * 
 * Responsibilities:
 * - Initialize BuildWorkflowOrchestrator with settings
 * - Start/pause/resume/cancel workflow
 * - Handle user decisions (iterate/next-page)
 * - Get workflow status
 */

import { WebviewMessage } from '../../../../shared/types/CommonTypes';
import { BuildWorkflowOrchestrator } from '../../services/BuildWorkflowOrchestrator';
import { WorkflowStateManager } from '../../services/WorkflowStateManager';
import { ContextManager } from '../../services/ContextManager';
import { HandoffManager } from '../../services/HandoffManager';
import { ParallelReviewerExecutor } from '../../services/ParallelReviewerExecutor';
import { SettingsService } from '../../../settings/services/SettingsService';
import { AgentManager } from '../../../../core/agent/AgentManager';
import { InputValidator } from '../../../../shared/services/InputValidator';
import { isValidProjectName } from '../../services/StageManager';
import { SummarizerAgent } from '../../../../core/agent/build/SummarizerAgent';
import { BuildModeService } from '../../services/BuildModeService';
import * as vscode from 'vscode';

export class WorkflowOrchestratorHandler {
    private orchestrator: BuildWorkflowOrchestrator | null = null;

    constructor(
        private readonly settingsService: SettingsService,
        private readonly agentManager: AgentManager,
        private readonly inputValidator: InputValidator,
        private readonly buildModeService: BuildModeService
    ) { }

    /**
     * Validate project name to prevent path traversal attacks
     */
    private validateProjectName(projectName: string): void {
        if (!projectName) {
            throw new Error('Project name is required');
        }
        if (!isValidProjectName(projectName)) {
            throw new Error('Invalid project name format');
        }
        if (projectName.includes('..') || projectName.includes('/') || projectName.includes('\\\\')) {
            throw new Error('Invalid project name: contains path characters');
        }
    }

    /**
     * Initialize BuildWorkflowOrchestrator with current settings
     */
    private async initializeOrchestrator(
        projectName: string,
        framework: string,
        screens: any[],
        webview: any
    ): Promise<BuildWorkflowOrchestrator> {
        // Get build settings
        const settings = await this.settingsService.getSettings();
        const buildSettings = settings.build;

        // Get workspace root
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';

        // Load personas from build data
        let personas: Array<{ personaId: string; personaName: string; personaRole: string }> = [];
        try {
            const usersData = await this.buildModeService.loadStage(projectName, 'users');
            if (usersData) {
                // Check for both 'personas' and 'generatedPersonas' properties
                const personasArray = usersData.personas || usersData.generatedPersonas;
                if (personasArray && Array.isArray(personasArray)) {
                    personas = personasArray.map((p: any) => ({
                        personaId: p.id || p.personaId || p.name,
                        personaName: p.name || p.personaName || 'Unknown',
                        personaRole: p.role || p.personaRole || p.occupation || p.backstory || 'User',
                    }));
                    console.log(`[WorkflowOrchestratorHandler] Loaded ${personas.length} personas from build data`);
                } else {
                    console.warn('[WorkflowOrchestratorHandler] No personas found in build data');
                }
            } else {
                console.warn('[WorkflowOrchestratorHandler] No users stage data found');
            }
        } catch (error) {
            console.error('[WorkflowOrchestratorHandler] Failed to load personas:', error);
            // Continue with empty personas array
        }

        // Create WorkflowStateManager
        const workflowStateManager = new WorkflowStateManager({
            projectName,
            baseDir: workspaceRoot,
        });

        // Create HandoffManager
        const handoffManager = new HandoffManager({
            projectName,
            baseDir: workspaceRoot,
        });

        // Create ParallelReviewerExecutor
        const parallelReviewerExecutor = new ParallelReviewerExecutor({
            maxConcurrent: buildSettings.enableParallelReview ? 5 : 1,
            reviewerTimeout: 30000,
            minCompletionRate: 0.5,
        });

        // Create SummarizerAgent for ContextManager
        const summarizerAgent = new SummarizerAgent(
            {
                conversationId: `build-${projectName}`,
                webview: webview as any,
                mode: 'build' as const,
                onDidUpdateMessages: () => { },
            },
            {
                model: buildSettings.summarizerModel,
                maxOutputTokens: 1500,
            }
        );

        // Create project context
        const projectContext = {
            projectName,
            framework,
            pages: screens.map((s: any, i: number) => ({
                pageId: s.id || `page-${i + 1}`,
                pageName: s.name || `Page ${i + 1}`,
                description: s.purpose || s.description || '',
            })),
            personas,
        };

        // Create ContextManager
        const contextManager = new ContextManager({
            workflowStateManager,
            summarizerAgent,
            projectContext,
            slidingWindowSize: 3,
            warningThreshold: 0.8,
            emergencyThreshold: 0.95,
        });

        // Create BuildWorkflowConfig
        const workflowConfig = {
            projectName,
            framework,
            pages: screens.map((s: any, i: number) => ({
                pageId: s.id || `page-${i + 1}`,
                pageName: s.name || `Page ${i + 1}`,
                description: s.purpose || s.description || '',
            })),
            personas,
            maxIterationsPerPage: buildSettings.maxIterationsPerPage,
            baseDir: workspaceRoot,
            webview,
            onLog: async (message: string, level?: 'info' | 'success' | 'error') => {
                // Send log message to webview
                webview.postMessage({
                    type: 'build-log',
                    projectName,
                    message,
                    level: level || 'info',
                    timestamp: Date.now(),
                });

                // Persist to disk so logs survive webview reloads
                try {
                    await this.buildModeService.appendLogEntry(projectName, {
                        timestamp: Date.now(),
                        type: level === 'error' ? 'error' : 'system',
                        stage: 'building',
                        content: message,
                    });
                } catch (error) {
                    console.error('[WorkflowOrchestratorHandler] Failed to persist log entry:', error);
                }
            },
        };

        // Create orchestrator with correct argument order
        const orchestrator = new BuildWorkflowOrchestrator(
            workflowConfig,
            this.agentManager,
            workflowStateManager,
            contextManager,
            handoffManager,
            parallelReviewerExecutor
        );

        console.log('[WorkflowOrchestratorHandler] BuildWorkflowOrchestrator initialized');
        return orchestrator;
    }

    /**
     * Handle start build workflow request
     */
    async handleStartBuildWorkflow(
        message: WebviewMessage,
        webview: any
    ): Promise<void> {
        try {
            const { projectName, framework, screens } = message;

            if (!projectName || !framework || !screens) {
                throw new Error('Project name, framework, and screens are required');
            }

            // Validate project name
            this.validateProjectName(projectName);

            // Initialize orchestrator with settings
            this.orchestrator = await this.initializeOrchestrator(projectName, framework, screens, webview);

            // Start workflow (initializes state)
            await this.orchestrator.startWorkflow();

            // Send success response immediately
            webview.postMessage({
                type: 'workflow-started',
                projectName,
            });

            console.log('[WorkflowOrchestratorHandler] Build workflow started successfully');

            // Start processing pages asynchronously (don't await - let it run in background)
            this.orchestrator.processAllPages().catch((error) => {
                console.error('[WorkflowOrchestratorHandler] Page processing failed:', error);
                webview.postMessage({
                    type: 'workflow-error',
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            });
        } catch (error) {
            console.error('[WorkflowOrchestratorHandler] Failed to start workflow:', error);
            webview.postMessage({
                type: 'workflow-error',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    /**
     * Handle user decision (iterate again / move to next page)
     */
    async handleUserDecision(
        message: WebviewMessage,
        webview: any
    ): Promise<void> {
        try {
            const { decision } = message; // 'iterate' | 'next-page'

            if (!decision) {
                throw new Error('Decision is required');
            }

            // Check if orchestrator exists
            if (!this.orchestrator) {
                throw new Error('No active workflow');
            }

            // Convert UI decision format to orchestrator format
            const orchestratorDecision = decision === 'iterate'
                ? 'iterate-again' as const
                : 'move-to-next-page' as const;

            // Pass decision to orchestrator (this will resolve the pending Promise)
            this.orchestrator.receiveUserDecision(orchestratorDecision);

            webview.postMessage({
                type: 'decision-processed',
                decision,
            });

            console.log(`[WorkflowOrchestratorHandler] User decision processed: ${decision}`);
        } catch (error) {
            console.error('[WorkflowOrchestratorHandler] Failed to process decision:', error);
            webview.postMessage({
                type: 'decision-error',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    /**
     * Handle pause workflow request
     */
    async handlePauseWorkflow(
        _message: WebviewMessage,
        webview: any
    ): Promise<void> {
        try {
            // Check if orchestrator exists
            if (!this.orchestrator) {
                throw new Error('No active workflow');
            }

            // Pause orchestrator
            await this.orchestrator.pauseWorkflow();

            webview.postMessage({
                type: 'workflow-paused',
            });

            console.log('[WorkflowOrchestratorHandler] Workflow paused');
        } catch (error) {
            console.error('[WorkflowOrchestratorHandler] Failed to pause workflow:', error);
            webview.postMessage({
                type: 'workflow-error',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    /**
     * Handle resume workflow request
     */
    async handleResumeWorkflow(
        _message: WebviewMessage,
        webview: any
    ): Promise<void> {
        try {
            // Check if orchestrator exists
            if (!this.orchestrator) {
                throw new Error('No active workflow');
            }

            // Resume orchestrator
            await this.orchestrator.resumeWorkflow();

            webview.postMessage({
                type: 'workflow-resumed',
            });

            console.log('[WorkflowOrchestratorHandler] Workflow resumed');
        } catch (error) {
            console.error('[WorkflowOrchestratorHandler] Failed to resume workflow:', error);
            webview.postMessage({
                type: 'workflow-error',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    /**
     * Handle cancel workflow request
     */
    async handleCancelWorkflow(
        _message: WebviewMessage,
        webview: any
    ): Promise<void> {
        try {
            // Check if orchestrator exists
            if (!this.orchestrator) {
                throw new Error('No active workflow');
            }

            // Cancel orchestrator
            await this.orchestrator.cancelWorkflow();

            // Clear orchestrator reference
            this.orchestrator = null;

            webview.postMessage({
                type: 'workflow-cancelled',
            });

            console.log('[WorkflowOrchestratorHandler] Workflow cancelled');
        } catch (error) {
            console.error('[WorkflowOrchestratorHandler] Failed to cancel workflow:', error);
            webview.postMessage({
                type: 'workflow-error',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    /**
     * Handle get workflow status request
     */
    async handleGetWorkflowStatus(
        _message: WebviewMessage,
        webview: any
    ): Promise<void> {
        try {
            // Get status from orchestrator
            const status = this.orchestrator?.getStatus() || null;

            webview.postMessage({
                type: 'workflow-status',
                status,
            });

            console.log('[WorkflowOrchestratorHandler] Workflow status retrieved');
        } catch (error) {
            console.error('[WorkflowOrchestratorHandler] Failed to get workflow status:', error);
            webview.postMessage({
                type: 'workflow-error',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
}
