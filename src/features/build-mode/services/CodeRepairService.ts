/**
 * CodeRepairService - Uses LLM to fix compilation errors in generated code
 */

import { AgentManager } from '../../../core/agent/AgentManager';
import { CompilationError } from '../utils/WebpackErrorParser';

export interface RepairResult {
    success: boolean;
    repairedCode?: string;
    error?: string;
    attempts: number;
}

export class CodeRepairService {
    constructor(private agentManager: AgentManager) { }

    /**
     * Attempt to repair code with compilation errors
     */
    async repairCode(
        originalCode: string,
        errors: CompilationError[],
        fileName: string,
        maxAttempts: number = 3
    ): Promise<RepairResult> {
        let attempts = 0;
        let currentCode = originalCode;

        while (attempts < maxAttempts) {
            attempts++;

            try {
                // Create repair prompt
                const errorMessages = errors.map(e =>
                    `- ${e.file}${e.line ? `:${e.line}` : ''}: ${e.message}`
                ).join('\n');

                const repairPrompt = `You previously generated this React TypeScript code for ${fileName}:

\`\`\`typescript
${currentCode}
\`\`\`

However, it has the following compilation errors:
${errorMessages}

Please fix the code to resolve ALL these errors. Common issues to check:
1. Missing or incorrect imports
2. Syntax errors
3. Type errors
4. Invalid identifiers (e.g., special characters in variable names)

Return ONLY the corrected TypeScript code, no explanations. The code should be complete and ready to use.`;

                // Call LLM to repair
                const conversationId = `code-repair-${fileName}-${Date.now()}`;
                const repairAgent = await this.agentManager.getOrCreateAgent(
                    conversationId,
                    'build'
                );

                await repairAgent.chat(
                    repairPrompt,
                    [],
                    {},
                    'You are an expert React TypeScript developer. Fix compilation errors in code.',
                    false
                );

                // Get response from conversation
                const conversation = await (this.agentManager as any)['config']
                    .conversationManager.getConversation(conversationId);
                const responseMsg = conversation?.messages.filter((m: any) => m.role === 'model').pop();
                let repairedCode = responseMsg?.text || '';

                // Remove markdown code blocks if present
                const codeBlockMatch = repairedCode.match(/```(?:tsx?|typescript)?\n([\s\S]*?)\n```/);
                if (codeBlockMatch) {
                    repairedCode = codeBlockMatch[1];
                }

                // Clean up the agent
                await this.agentManager.disposeAgent(conversationId);

                return {
                    success: true,
                    repairedCode: repairedCode.trim(),
                    attempts,
                };

            } catch (error: any) {
                if (attempts >= maxAttempts) {
                    return {
                        success: false,
                        error: error.message,
                        attempts,
                    };
                }
                // Continue to next attempt
            }
        }

        return {
            success: false,
            error: 'Max repair attempts reached',
            attempts,
        };
    }
}
