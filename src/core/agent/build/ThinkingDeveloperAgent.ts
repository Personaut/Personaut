/**
 * ThinkingDeveloperAgent - DeveloperAgent with extended thinking capabilities
 * 
 * Implements multi-step reasoning process:
 * 1. Requirements Analysis
 * 2. Architecture Planning
 * 3. Edge Case Identification
 * 4. Component Design
 * 5. Code Generation
 * 6. Verification
 */

import { DeveloperAgent } from './DeveloperAgent';
import { BaseAgentConfig } from '../base/BaseAgent';
import { DeveloperAgentOptions } from '../AgentTypes';

export interface ThinkingResult {
    success: boolean;
    code?: string;
    thinking?: string;
    error?: string;
}

export interface ImplementPageOptions {
    pageName: string;
    uxSpec: string;
    framework: string;
    outputPath: string;
}

/**
 * DeveloperAgent with extended thinking capabilities
 * Uses multi-step reasoning to produce higher quality code
 */
export class ThinkingDeveloperAgent extends DeveloperAgent {
    private thinkingLog: string[] = [];

    constructor(
        config: Omit<BaseAgentConfig, 'agentType'>,
        options: DeveloperAgentOptions & {
            settings?: any;
            onRequestConfirmation?: (action: any) => Promise<boolean>;
        }
    ) {
        super(config, options);
    }

    /**
     * Implement a page with extended thinking
     */
    public async implementPageWithThinking(
        options: ImplementPageOptions
    ): Promise<ThinkingResult> {
        this.thinkingLog = [];

        try {
            this.log('🧠 Starting multi-step thinking process...');

            // Step 1: Requirements Analysis
            this.log('📋 Step 1: Analyzing requirements...');
            const analysis = await this.analyzeRequirements(options.uxSpec);
            this.thinkingLog.push('=== STEP 1: Requirements Analysis ===\n' + analysis);

            // Step 2: Architecture Planning
            this.log('🏗️ Step 2: Planning architecture...');
            const architecture = await this.planArchitecture(analysis, options.framework);
            this.thinkingLog.push('\n=== STEP 2: Architecture Planning ===\n' + architecture);

            // Step 3: Edge Case Identification
            this.log('⚠️ Step 3: Identifying edge cases...');
            const edgeCases = await this.identifyEdgeCases(architecture);
            this.thinkingLog.push('\n=== STEP 3: Edge Case Identification ===\n' + edgeCases);

            // Step 4: Component Design
            this.log('🎨 Step 4: Designing components...');
            const design = await this.designComponents(architecture, edgeCases);
            this.thinkingLog.push('\n=== STEP 4: Component Design ===\n' + design);

            // Step 5: Code Generation
            this.log('💻 Step 5: Generating implementation...');
            const code = await this.generateImplementation(design, options.framework);
            this.thinkingLog.push('\n=== STEP 5: Code Generation ===\nCode generated successfully');

            // Step 6: Write to file
            this.log('💾 Step 6: Writing code to file...');
            const writeResult = await this.writeFile(options.outputPath, code);

            if (!writeResult.success) {
                throw new Error(`Failed to write file: ${writeResult.error}`);
            }

            this.thinkingLog.push('\n=== STEP 6: File Written ===\n' + writeResult.path);

            // Step 7: Verification (optional - can be expensive)
            // const verification = await this.verifyCode(code);
            // this.thinkingLog.push('\n=== STEP 7: Verification ===\n' + verification);

            this.log('✅ Implementation complete!');

            return {
                success: true,
                code,
                thinking: this.thinkingLog.join('\n'),
            };
        } catch (error: any) {
            this.log(`❌ Implementation failed: ${error.message}`);
            return {
                success: false,
                error: error.message,
                thinking: this.thinkingLog.join('\n'),
            };
        }
    }

    /**
     * Analyze requirements from UX specification
     */
    private async analyzeRequirements(uxSpec: string): Promise<string> {
        const prompt = `Analyze this UX specification and extract key information:

${uxSpec}

Provide a structured analysis covering:

1. **Core Features**: What functionality is required?
2. **User Interactions**: What can users do on this page?
3. **Data Requirements**: What data needs to be displayed or managed?
4. **UI Components**: What visual elements are needed?
5. **Technical Constraints**: Any specific requirements or limitations?

Be concise but thorough. Focus on what's essential for implementation.`;

        return await this.chatAndExtractResponse(prompt);
    }

    /**
     * Plan component architecture
     */
    private async planArchitecture(analysis: string, framework: string): Promise<string> {
        const prompt = `Based on this requirements analysis:

${analysis}

Design a ${framework} component architecture:

1. **Main Component**: What's the primary component and its responsibility?
2. **Sub-Components**: What reusable components should be created?
3. **State Management**: How will state be managed? (useState, useReducer, context, etc.)
4. **Props Interface**: What props does the main component need?
5. **Data Flow**: How does data flow between components?
6. **Styling Approach**: How will styling be handled? (inline, CSS-in-JS, modules, etc.)

Provide a clear architectural plan that will guide implementation.`;

        return await this.chatAndExtractResponse(prompt);
    }

    /**
     * Identify edge cases and error scenarios
     */
    private async identifyEdgeCases(architecture: string): Promise<string> {
        const prompt = `Given this component architecture:

${architecture}

Identify potential edge cases and error scenarios that need to be handled:

1. **Input Validation**: What invalid inputs could occur?
2. **Network/Async Errors**: What if data fetching fails?
3. **Empty States**: What if there's no data to display?
4. **Loading States**: How to handle async operations?
5. **Error Boundaries**: What errors need graceful handling?
6. **Accessibility**: What a11y considerations are important?
7. **Performance**: Any performance concerns (large lists, re-renders, etc.)?

List the most important edge cases to handle in the implementation.`;

        return await this.chatAndExtractResponse(prompt);
    }

    /**
     * Design detailed component structure
     */
    private async designComponents(architecture: string, edgeCases: string): Promise<string> {
        const prompt = `Create a detailed component design:

**Architecture:**
${architecture}

**Edge Cases to Handle:**
${edgeCases}

Provide a comprehensive design including:

1. **Component Structure**: Detailed breakdown of each component
2. **TypeScript Interfaces**: All types, interfaces, and props
3. **State Variables**: What state is needed and why
4. **Event Handlers**: What functions/handlers are needed
5. **Styling Plan**: Specific styling approach and key styles
6. **Error Handling**: How each edge case will be handled
7. **Sample Data**: Example data structure if needed

This design will be directly translated into code, so be specific and complete.`;

        return await this.chatAndExtractResponse(prompt);
    }

    /**
     * Generate implementation code
     */
    private async generateImplementation(design: string, framework: string): Promise<string> {
        const prompt = `Implement this design in ${framework}:

${design}

Generate complete, production-ready code with:

✅ Complete implementation (no placeholders or TODOs)
✅ Proper TypeScript types and interfaces
✅ Comprehensive error handling for all edge cases
✅ Accessibility features (ARIA labels, keyboard navigation)
✅ Responsive styling (works on mobile and desktop)
✅ Inline comments for complex logic
✅ Clean, maintainable code structure
✅ Sample/mock data if needed for demonstration

Important:
- Use functional components with hooks
- Follow ${framework} best practices
- Make it visually appealing with good UX
- Ensure it's a complete, working implementation

Provide ONLY the code, no explanations. Start with imports and end with export.`;

        const response = await this.chatAndExtractResponse(prompt);

        // Extract code from markdown code blocks if present
        const codeMatch = response.match(/```(?:typescript|tsx|jsx|javascript)?\n([\s\S]*?)```/);
        if (codeMatch) {
            return codeMatch[1].trim();
        }

        return response.trim();
    }

    /**
     * Verify generated code (optional - can be expensive)
     */
    private async verifyCode(code: string): Promise<string> {
        const prompt = `Verify this code for quality and correctness:

\`\`\`typescript
${code.substring(0, 2000)}${code.length > 2000 ? '\n... (truncated)' : ''}
\`\`\`

Check for:
1. **Syntax Errors**: Any obvious syntax issues?
2. **Type Safety**: TypeScript types used correctly?
3. **Logic Errors**: Any potential bugs or logic issues?
4. **Best Practices**: Following framework best practices?
5. **Performance**: Any obvious performance concerns?
6. **Accessibility**: Basic a11y compliance?

Provide a brief verification summary (2-3 sentences).`;

        return await this.chatAndExtractResponse(prompt);
    }

    /**
     * Helper to chat and extract text response
     */
    private chatAndExtractResponse(prompt: string): Promise<string> {
        return new Promise((resolve) => {
            let capturedResponse = '';
            const originalCallback = this.onDidUpdateMessages;

            // Override callback to capture response
            (this as any).onDidUpdateMessages = (messages: any[]) => {
                // Call original callback first
                originalCallback(messages);

                // Capture last model message
                const lastMessage = messages[messages.length - 1];
                if (lastMessage?.role === 'model' && lastMessage.text) {
                    capturedResponse = lastMessage.text;
                }
            };

            // Send chat and wait for completion
            this.chat(prompt, [], {}, undefined, false)
                .then(() => {
                    // Restore original callback
                    (this as any).onDidUpdateMessages = originalCallback;

                    // Resolve with captured response
                    if (capturedResponse) {
                        resolve(capturedResponse);
                    } else {
                        console.error('[ThinkingDeveloperAgent] No response captured');
                        resolve('');
                    }
                })
                .catch((error) => {
                    // Restore original callback on error
                    (this as any).onDidUpdateMessages = originalCallback;
                    console.error('[ThinkingDeveloperAgent] Chat error:', error.message);
                    resolve('');
                });
        });
    }

    /**
     * Log message (can be overridden to send to UI)
     */
    private log(message: string): void {
        console.log(`[ThinkingDeveloperAgent] ${message}`);
    }
}
