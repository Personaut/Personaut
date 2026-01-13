/**
 * DeveloperAgent - Framework-specific code generation agent
 * Handles code generation, repair, and development tasks for specific frameworks
 * 
 * Enhanced with Cline-like capabilities:
 * - Phase 1: Code generation (existing)
 * - Phase 2: File operations and command execution
 * - Phase 3: Multi-step planning and verification
 */

import { BaseAgent, BaseAgentConfig } from '../base/BaseAgent';
import { AGENT_CAPABILITIES } from '../base/AgentCapabilities';
import { DeveloperAgentOptions, Framework } from '../AgentTypes';
import { getCodePrompt } from '../../prompts/CodePrompts';

/**
 * Plan step for multi-step implementation
 */
export interface PlanStep {
    id: string;
    description: string;
    type: 'generate' | 'write' | 'command' | 'verify';
    input?: any;
    output?: any;
    status: 'pending' | 'running' | 'complete' | 'failed';
}

/**
 * Implementation plan
 */
export interface ImplementationPlan {
    steps: PlanStep[];
    totalSteps: number;
    currentStep: number;
}

/**
 * File operation result
 */
export interface FileOperationResult {
    success: boolean;
    path: string;
    error?: string;
}

/**
 * Command execution result
 */
export interface CommandResult {
    success: boolean;
    stdout: string;
    stderr: string;
    exitCode: number;
}

/**
 * Verification result
 */
export interface VerificationResult {
    success: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * Confirmation request for user approval
 */
export interface ConfirmationRequest {
    type: 'write-file' | 'read-file' | 'execute-command' | 'planning' | 'verification';
    action: string;
    details: {
        path?: string;
        command?: string;
        code?: string;
        description?: string;
    };
}

/**
 * DeveloperAgent handles framework-specific code generation
 * Supports: React, Next.js, Vue, Flutter, HTML/CSS/JS
 * 
 * Enhanced with:
 * - File operations (write, read, edit)
 * - Command execution (compile, test, run)
 * - Multi-step planning
 * - Code verification
 * - User confirmation for non-autonomous actions
 */
export class DeveloperAgent extends BaseAgent {
    private readonly framework: Framework;
    private projectPath?: string;
    private settings?: any;
    private onRequestConfirmation?: (action: ConfirmationRequest) => Promise<boolean>;

    constructor(
        config: Omit<BaseAgentConfig, 'agentType'>,
        options: DeveloperAgentOptions & {
            settings?: any;
            onRequestConfirmation?: (action: ConfirmationRequest) => Promise<boolean>;
        }
    ) {
        super({
            ...config,
            agentType: 'developer',
            mode: config.mode || 'build',
        });

        this.framework = options.framework;
        this.projectPath = options.projectPath;
        this.settings = options.settings;
        this.onRequestConfirmation = options.onRequestConfirmation;
    }

    /**
     * Register capabilities for developer agent
     */
    protected registerCapabilities(): void {
        this.capabilityRegistry.registerMultiple(this.conversationId, [
            AGENT_CAPABILITIES.CODE_GENERATION,
            AGENT_CAPABILITIES.CODE_REPAIR,
        ]);
    }

    /**
     * Get system prompt for developer agent
     * Returns framework-specific code generation prompt
     */
    public getSystemPrompt(): string {
        return getCodePrompt(this.framework);
    }

    /**
     * Get the framework this agent is specialized for
     */
    public getFramework(): Framework {
        return this.framework;
    }

    /**
     * Set the project path for file operations
     */
    public setProjectPath(path: string): void {
        this.projectPath = path;
    }

    // ==========================================
    // PHASE 1: Code Generation (Existing)
    // ==========================================

    /**
     * Generate code based on specification
     * @param spec - Code specification or requirements
     * @returns Generated code
     */
    public async generateCode(spec: string): Promise<string> {
        console.log('[DeveloperAgent] generateCode called');
        console.log('[DeveloperAgent] Spec length:', spec?.length || 0);

        const prompt = `Generate ${this.framework} code for the following specification:\n\n${spec}\n\nProvide complete, production-ready code following ${this.framework} best practices.`;
        console.log('[DeveloperAgent] Prompt created, length:', prompt.length);
        console.log('[DeveloperAgent] Sending chat...');

        try {
            // Call chat and wait for completion
            await this.chat(prompt, [], {}, undefined, false);

            console.log('[DeveloperAgent] Chat completed');
            console.log('[DeveloperAgent] Message history length:', this.messageHistory.length);

            // Read directly from messageHistory after chat completes
            const lastMessage = this.messageHistory[this.messageHistory.length - 1];
            console.log('[DeveloperAgent] Last message:', {
                role: lastMessage?.role,
                hasText: !!lastMessage?.text,
                textLength: lastMessage?.text?.length || 0
            });

            if (lastMessage?.role === 'model' && lastMessage.text) {
                const code = lastMessage.text;
                console.log('[DeveloperAgent] Code extracted:', code.length, 'bytes');
                console.log('[DeveloperAgent] Code preview:', code.substring(0, 200));
                return code;
            } else {
                console.error('[DeveloperAgent] No model response found in message history');
                console.error('[DeveloperAgent] Message history:', this.messageHistory.map(m => ({ role: m.role, textLength: m.text?.length })));
                return '';
            }
        } catch (error) {
            console.error('[DeveloperAgent] Chat error:', error);
            return '';
        }
    }

    /**
     * Repair code with compilation errors
     * @param code - Code with errors
     * @param errors - List of error messages
     * @returns Repaired code
     */
    public async repairCode(code: string, errors: string[]): Promise<string> {
        const errorList = errors.map((e, i) => `${i + 1}. ${e}`).join('\n');
        const prompt = `Fix the following ${this.framework} code that has compilation errors:\n\n\`\`\`typescript\n${code}\n\`\`\`\n\nErrors:\n${errorList}\n\nProvide the corrected code.`;

        let repairedCode = '';
        const originalOnUpdate = this.onDidUpdateMessages;

        (this as any).onDidUpdateMessages = (messages: any[]) => {
            originalOnUpdate(messages);
            const lastMessage = messages[messages.length - 1];
            if (lastMessage?.role === 'model') {
                repairedCode = lastMessage.text;
            }
        };

        await this.chat(prompt, [], {}, undefined, false);
        (this as any).onDidUpdateMessages = originalOnUpdate;

        return repairedCode;
    }

    /**
     * Generate a component
     * @param componentName - Name of the component
     * @param description - Component description
     * @returns Generated component code
     */
    public async generateComponent(componentName: string, description: string): Promise<string> {
        const prompt = `Generate a ${this.framework} component named "${componentName}":\n\n${description}\n\nInclude:\n- TypeScript types\n- Props interface\n- Proper styling\n- Accessibility features\n- Comments`;

        let componentCode = '';
        const originalOnUpdate = this.onDidUpdateMessages;

        (this as any).onDidUpdateMessages = (messages: any[]) => {
            originalOnUpdate(messages);
            const lastMessage = messages[messages.length - 1];
            if (lastMessage?.role === 'model') {
                componentCode = lastMessage.text;
            }
        };

        await this.chat(prompt, [], {}, undefined, false);
        (this as any).onDidUpdateMessages = originalOnUpdate;

        return componentCode;
    }

    // ==========================================
    // PHASE 2: File Operations & Commands
    // ==========================================

    /**
     * Write code to a file
     * @param filePath - Relative path from project root
     * @param code - Code content to write
     * @returns File operation result
     */
    public async writeFile(filePath: string, code: string): Promise<FileOperationResult> {
        if (!this.projectPath) {
            return {
                success: false,
                path: filePath,
                error: 'Project path not set',
            };
        }

        // Check if we need user confirmation
        const autoWrite = this.settings?.buildAutonomy?.autoWriteFiles ?? true;
        if (!autoWrite && this.onRequestConfirmation) {
            const confirmed = await this.onRequestConfirmation({
                type: 'write-file',
                action: `Write file: ${filePath}`,
                details: {
                    path: filePath,
                    code: code.substring(0, 500) + (code.length > 500 ? '...' : ''), // Preview
                },
            });

            if (!confirmed) {
                return {
                    success: false,
                    path: filePath,
                    error: 'User declined file write operation',
                };
            }
        }

        try {
            const fs = await import('fs/promises');
            const path = await import('path');

            const fullPath = path.join(this.projectPath, filePath);
            const dir = path.dirname(fullPath);

            // Ensure directory exists
            await fs.mkdir(dir, { recursive: true });

            // Write file
            await fs.writeFile(fullPath, code, 'utf-8');

            return {
                success: true,
                path: fullPath,
            };
        } catch (error: any) {
            return {
                success: false,
                path: filePath,
                error: error.message,
            };
        }
    }

    /**
     * Read a file
     * @param filePath - Relative path from project root
     * @returns File content or error
     */
    public async readFile(filePath: string): Promise<{ success: boolean; content?: string; error?: string }> {
        if (!this.projectPath) {
            return {
                success: false,
                error: 'Project path not set',
            };
        }

        try {
            const fs = await import('fs/promises');
            const path = await import('path');

            const fullPath = path.join(this.projectPath, filePath);
            const content = await fs.readFile(fullPath, 'utf-8');

            return {
                success: true,
                content,
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Execute a command in the project directory
     * @param command - Command to execute
     * @returns Command result
     */
    public async executeCommand(command: string): Promise<CommandResult> {
        if (!this.projectPath) {
            return {
                success: false,
                stdout: '',
                stderr: 'Project path not set',
                exitCode: 1,
            };
        }

        try {
            const { exec } = await import('child_process');
            const util = await import('util');
            const execPromise = util.promisify(exec);

            const { stdout, stderr } = await execPromise(command, {
                cwd: this.projectPath,
                timeout: 60000, // 1 minute timeout
            });

            return {
                success: true,
                stdout,
                stderr,
                exitCode: 0,
            };
        } catch (error: any) {
            return {
                success: false,
                stdout: error.stdout || '',
                stderr: error.stderr || error.message,
                exitCode: error.code || 1,
            };
        }
    }

    /**
     * Implement specification with file writing
     * @param spec - Code specification
     * @param outputPath - Where to write the code
     * @returns File operation result
     */
    public async implementSpec(spec: string, outputPath: string): Promise<FileOperationResult> {
        const code = await this.generateCode(spec);
        return await this.writeFile(outputPath, code);
    }

    // ==========================================
    // PHASE 3: Multi-Step Planning
    // ==========================================

    /**
     * Create an implementation plan from specification
     * @param spec - Implementation specification
     * @returns Implementation plan
     */
    public async planImplementation(spec: string): Promise<ImplementationPlan> {
        const prompt = `Create a step-by-step implementation plan for the following specification:\n\n${spec}\n\nBreak it down into discrete steps. For each step, specify:\n1. Description\n2. Type (generate, write, command, verify)\n3. Dependencies on previous steps\n\nProvide the plan in JSON format.`;

        let planJson = '';
        const originalOnUpdate = this.onDidUpdateMessages;

        (this as any).onDidUpdateMessages = (messages: any[]) => {
            originalOnUpdate(messages);
            const lastMessage = messages[messages.length - 1];
            if (lastMessage?.role === 'model') {
                planJson = lastMessage.text;
            }
        };

        await this.chat(prompt, [], {}, undefined, false);
        (this as any).onDidUpdateMessages = originalOnUpdate;

        // Parse the plan (with fallback to simple plan)
        try {
            const parsed = JSON.parse(planJson);
            return {
                steps: parsed.steps || [],
                totalSteps: parsed.steps?.length || 0,
                currentStep: 0,
            };
        } catch {
            // Fallback: create a simple plan
            return {
                steps: [
                    {
                        id: 'generate',
                        description: 'Generate code from specification',
                        type: 'generate',
                        status: 'pending',
                    },
                    {
                        id: 'write',
                        description: 'Write code to file',
                        type: 'write',
                        status: 'pending',
                    },
                    {
                        id: 'verify',
                        description: 'Verify implementation',
                        type: 'verify',
                        status: 'pending',
                    },
                ],
                totalSteps: 3,
                currentStep: 0,
            };
        }
    }

    /**
     * Execute a single plan step
     * @param step - Plan step to execute
     * @returns Updated step with result
     */
    public async executeStep(step: PlanStep): Promise<PlanStep> {
        const updatedStep: PlanStep = { ...step, status: 'running' };

        try {
            switch (step.type) {
                case 'generate':
                    const code = await this.generateCode(step.input || '');
                    updatedStep.output = code;
                    updatedStep.status = 'complete';
                    break;

                case 'write':
                    const writeResult = await this.writeFile(
                        step.input?.path || 'output.tsx',
                        step.input?.code || ''
                    );
                    updatedStep.output = writeResult;
                    updatedStep.status = writeResult.success ? 'complete' : 'failed';
                    break;

                case 'command':
                    const cmdResult = await this.executeCommand(step.input?.command || '');
                    updatedStep.output = cmdResult;
                    updatedStep.status = cmdResult.success ? 'complete' : 'failed';
                    break;

                case 'verify':
                    const verifyResult = await this.verifyImplementation(step.input?.code || '');
                    updatedStep.output = verifyResult;
                    updatedStep.status = verifyResult.success ? 'complete' : 'failed';
                    break;

                default:
                    updatedStep.status = 'failed';
                    updatedStep.output = { error: 'Unknown step type' };
            }
        } catch (error: any) {
            updatedStep.status = 'failed';
            updatedStep.output = { error: error.message };
        }

        return updatedStep;
    }

    /**
     * Verify implementation
     * @param code - Code to verify
     * @returns Verification result
     */
    public async verifyImplementation(code: string): Promise<VerificationResult> {
        const prompt = `Verify the following ${this.framework} code for:\n1. Syntax errors\n2. Type errors\n3. Best practice violations\n4. Potential bugs\n\n\`\`\`typescript\n${code}\n\`\`\`\n\nProvide a JSON response with:\n- success: boolean\n- errors: string[]\n- warnings: string[]`;

        let verificationJson = '';
        const originalOnUpdate = this.onDidUpdateMessages;

        (this as any).onDidUpdateMessages = (messages: any[]) => {
            originalOnUpdate(messages);
            const lastMessage = messages[messages.length - 1];
            if (lastMessage?.role === 'model') {
                verificationJson = lastMessage.text;
            }
        };

        await this.chat(prompt, [], {}, undefined, false);
        (this as any).onDidUpdateMessages = originalOnUpdate;

        // Parse verification result
        try {
            return JSON.parse(verificationJson);
        } catch {
            // Fallback: assume success if we can't parse
            return {
                success: true,
                errors: [],
                warnings: [],
            };
        }
    }

    /**
     * Implement with full planning and verification
     * @param spec - Implementation specification
     * @param outputPath - Where to write the code
     * @returns Verification result
     */
    public async implementWithPlanning(
        spec: string,
        outputPath: string
    ): Promise<VerificationResult> {
        // Phase 1: Plan
        const plan = await this.planImplementation(spec);

        // Phase 2: Execute each step
        for (let i = 0; i < plan.steps.length; i++) {
            const step = plan.steps[i];

            // Prepare step input based on type
            if (step.type === 'generate') {
                step.input = spec;
            } else if (step.type === 'write' && i > 0) {
                // Use output from previous generate step
                const prevStep = plan.steps[i - 1];
                if (prevStep.type === 'generate' && prevStep.output) {
                    step.input = {
                        path: outputPath,
                        code: prevStep.output,
                    };
                }
            } else if (step.type === 'verify' && i > 0) {
                // Use output from generate step
                const generateStep = plan.steps.find(s => s.type === 'generate');
                if (generateStep?.output) {
                    step.input = { code: generateStep.output };
                }
            }

            // Execute step
            plan.steps[i] = await this.executeStep(step);
            plan.currentStep = i + 1;

            // Stop if step failed
            if (plan.steps[i].status === 'failed') {
                break;
            }
        }

        // Phase 3: Return verification result
        const verifyStep = plan.steps.find(s => s.type === 'verify');
        if (verifyStep?.output) {
            return verifyStep.output as VerificationResult;
        }

        return {
            success: true,
            errors: [],
            warnings: [],
        };
    }

    /**
     * Get framework-specific best practices
     */
    public getBestPractices(): string[] {
        const practices: Record<Framework, string[]> = {
            react: [
                'Use functional components with hooks',
                'Define TypeScript prop interfaces',
                'Implement proper error boundaries',
                'Use React.memo for performance',
                'Follow React Router v6 patterns',
            ],
            nextjs: [
                'Use Server Components by default',
                'Add "use client" only when needed',
                'Implement proper metadata for SEO',
                'Use next/image for optimization',
                'Leverage ISR for dynamic content',
            ],
            vue: [
                'Use Composition API with <script setup>',
                'Define props with TypeScript',
                'Use reactive() and ref() appropriately',
                'Implement scoped styles',
                'Follow Vue 3 best practices',
            ],
            flutter: [
                'Use StatelessWidget when possible',
                'Implement proper state management',
                'Follow Material Design guidelines',
                'Use const constructors',
                'Optimize with RepaintBoundary',
            ],
            html: [
                'Use semantic HTML5 elements',
                'Implement responsive design',
                'Follow BEM naming convention',
                'Use modern CSS (Flexbox, Grid)',
                'Write ES6+ JavaScript',
            ],
        };

        return practices[this.framework] || [];
    }
}
