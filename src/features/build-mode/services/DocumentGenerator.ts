/**
 * DocumentGenerator - Generates structured markdown documents for the Design workflow
 *
 * Generates:
 * - Style Guide (colors, typography, spacing, components)
 * - Page Requirements Documents (per page with references)
 * - User Flow Documents (navigation paths)
 * - Task List Documents (with traceability)
 * - Steering Documents (technical constraints)
 *
 * All documents follow the structure defined in Requirements 24.1-24.9.
 *
 * **Part of Build-to-Design Transformation**
 * Validates: Requirements 24.1-24.9, 10.4, 11.4
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Document types supported by the generator
 */
export type DocumentType =
    | 'style_guide'
    | 'page_requirements'
    | 'user_flow'
    | 'task_list'
    | 'steering';

/**
 * YAML frontmatter metadata
 */
export interface DocumentFrontmatter {
    document_type: DocumentType;
    project_name: string;
    generated_at: string;
    version: string;
    traceability?: {
        features?: string[];
        stories?: string[];
        pages?: string[];
        tasks?: string[];
    };
}

/**
 * Style Guide sections
 */
export interface StyleGuideContent {
    projectName: string;
    colorPalette: {
        primary: Array<{ name: string; value: string; usage: string }>;
        secondary: Array<{ name: string; value: string; usage: string }>;
        semantic: {
            success: string;
            warning: string;
            error: string;
            info: string;
        };
    };
    typography: {
        fontFamilies: {
            primary: string;
            secondary?: string;
            monospace?: string;
        };
        fontSizes: Array<{ name: string; size: string; usage: string }>;
        fontWeights: Array<{ name: string; weight: number }>;
        lineHeights: Array<{ name: string; value: string }>;
    };
    spacing: {
        scale: Array<{ name: string; value: string }>;
        layoutGrid: {
            columns: number;
            gutter: string;
            margin: string;
        };
    };
    components: {
        buttons: {
            variants: string[];
            sizes: string[];
            states: string[];
        };
        inputs: {
            types: string[];
            states: string[];
        };
        cards: {
            variants: string[];
        };
        navigation: {
            types: string[];
        };
    };
    responsiveBreakpoints: Array<{ name: string; minWidth: string; description: string }>;
}

/**
 * Page Requirements Document content
 */
export interface PageRequirementsContent {
    pageName: string;
    projectName: string;
    pageId: string;
    overview: {
        purpose: string;
        userStoriesAddressed: Array<{ id: string; title: string }>;
    };
    layout: {
        structure: string;
        componentHierarchy: string[];
    };
    components: Array<{
        name: string;
        props: Record<string, string>;
        behavior: string[];
        stylingNotes: string;
    }>;
    dataRequirements: {
        state: Array<{ name: string; type: string; description: string }>;
        apiCalls: Array<{ endpoint: string; method: string; purpose: string }>;
        propsFromParent: Array<{ name: string; type: string }>;
    };
    userInteractions: Array<{
        event: string;
        trigger: string;
        action: string;
        navigationTarget?: string;
    }>;
    accessibility: {
        ariaRequirements: string[];
        keyboardNavigation: string[];
    };
}

/**
 * User Flow Document content
 */
export interface UserFlowContent {
    flowName: string;
    flowId: string;
    projectName: string;
    overview: {
        startPage: { id: string; name: string };
        endPage: { id: string; name: string };
        userGoal: string;
    };
    steps: Array<{
        stepNumber: number;
        action: string;
        page: { id: string; name: string };
        trigger: string;
        dataPassed: string[];
        next: { id: string; name: string } | null;
    }>;
    conditionalPaths: Array<{
        condition: string;
        pathA: { description: string; destination: string };
        pathB: { description: string; destination: string };
    }>;
    errorHandling: Array<{
        scenario: string;
        recoveryPath: string;
    }>;
    relatedStoryIds: string[];
}

/**
 * Task List Document content
 */
export interface TaskListContent {
    projectName: string;
    overview: {
        totalTasks: number;
        estimatedComplexity: 'Low' | 'Medium' | 'High';
        totalEstimatedHours: number;
    };
    tasks: Array<{
        id: string;
        title: string;
        priority: 'P0' | 'P1' | 'P2';
        complexity: 'low' | 'medium' | 'high';
        estimatedHours: number;
        dependencies: string[];
        storyId: string;
        pageId?: string;
        description: string;
        acceptanceCriteria: string[];
        technicalNotes?: string;
        category: 'frontend' | 'backend' | 'database' | 'integration' | 'testing';
    }>;
}

/**
 * Steering Document content
 */
export interface SteeringDocumentContent {
    projectName: string;
    projectOverview: {
        name: string;
        description: string;
        targetUsers: string[];
        coreValueProposition: string;
    };
    technicalStack: {
        framework: string;
        language: string;
        styling: string;
        stateManagement: string;
        keyLibraries: string[];
    };
    codingStandards: {
        namingConventions: {
            components: string;
            functions: string;
            files: string;
            constants: string;
        };
        fileOrganization: string;
        codeStyle: string;
    };
    architecturalPatterns: {
        componentArchitecture: string;
        stateManagement: string;
        dataFlow: string;
    };
    qualityRequirements: {
        testingStrategy: string;
        accessibilityStandards: string;
        performanceTargets: {
            firstContentfulPaint: string;
            largestContentfulPaint: string;
            timeToInteractive?: string;
        };
    };
    constraints: {
        technologyConstraints: string[];
        scopeBoundaries: string[];
        outOfScope: string[];
    };
}

// ============================================================================
// DOCUMENT GENERATOR CLASS
// ============================================================================

/**
 * DocumentGenerator - Creates structured markdown documents
 */
export class DocumentGenerator {
    private outputDir: string;

    constructor(projectName: string, outputDir?: string) {
        this.outputDir = outputDir || `.personaut/design/${this.toKebabCase(projectName)}`;
    }

    /**
     * Generate YAML frontmatter for a document
     */
    public generateFrontmatter(frontmatter: DocumentFrontmatter): string {
        const lines = [
            '---',
            `document_type: ${frontmatter.document_type}`,
            `project_name: "${frontmatter.project_name}"`,
            `generated_at: "${frontmatter.generated_at}"`,
            `version: "${frontmatter.version}"`,
        ];

        if (frontmatter.traceability) {
            lines.push('traceability:');
            if (frontmatter.traceability.features?.length) {
                lines.push(`  features: [${frontmatter.traceability.features.map(f => `"${f}"`).join(', ')}]`);
            }
            if (frontmatter.traceability.stories?.length) {
                lines.push(`  stories: [${frontmatter.traceability.stories.map(s => `"${s}"`).join(', ')}]`);
            }
            if (frontmatter.traceability.pages?.length) {
                lines.push(`  pages: [${frontmatter.traceability.pages.map(p => `"${p}"`).join(', ')}]`);
            }
            if (frontmatter.traceability.tasks?.length) {
                lines.push(`  tasks: [${frontmatter.traceability.tasks.map(t => `"${t}"`).join(', ')}]`);
            }
        }

        lines.push('---', '');
        return lines.join('\n');
    }

    /**
     * Generate Style Guide document (Requirement 24.1)
     */
    public generateStyleGuide(content: StyleGuideContent): string {
        const frontmatter = this.generateFrontmatter({
            document_type: 'style_guide',
            project_name: content.projectName,
            generated_at: new Date().toISOString(),
            version: '1.0',
        });

        const sections: string[] = [
            frontmatter,
            `# Style Guide: ${content.projectName}`,
            '',
            '## Color Palette',
            '',
            '### Primary Colors',
            '',
        ];

        // Primary colors
        for (const color of content.colorPalette.primary) {
            sections.push(`- **${color.name}:** \`${color.value}\` - ${color.usage}`);
        }
        sections.push('');

        // Secondary colors
        sections.push('### Secondary Colors', '');
        for (const color of content.colorPalette.secondary) {
            sections.push(`- **${color.name}:** \`${color.value}\` - ${color.usage}`);
        }
        sections.push('');

        // Semantic colors
        sections.push('### Semantic Colors', '');
        sections.push(`- **Success:** \`${content.colorPalette.semantic.success}\``);
        sections.push(`- **Warning:** \`${content.colorPalette.semantic.warning}\``);
        sections.push(`- **Error:** \`${content.colorPalette.semantic.error}\``);
        sections.push(`- **Info:** \`${content.colorPalette.semantic.info}\``);
        sections.push('');

        // Typography
        sections.push('## Typography', '');

        sections.push('### Font Families', '');
        sections.push(`- **Primary:** \`${content.typography.fontFamilies.primary}\``);
        if (content.typography.fontFamilies.secondary) {
            sections.push(`- **Secondary:** \`${content.typography.fontFamilies.secondary}\``);
        }
        if (content.typography.fontFamilies.monospace) {
            sections.push(`- **Monospace:** \`${content.typography.fontFamilies.monospace}\``);
        }
        sections.push('');

        sections.push('### Font Sizes', '');
        for (const size of content.typography.fontSizes) {
            sections.push(`- **${size.name}:** \`${size.size}\` - ${size.usage}`);
        }
        sections.push('');

        sections.push('### Font Weights', '');
        for (const weight of content.typography.fontWeights) {
            sections.push(`- **${weight.name}:** \`${weight.weight}\``);
        }
        sections.push('');

        sections.push('### Line Heights', '');
        for (const lineHeight of content.typography.lineHeights) {
            sections.push(`- **${lineHeight.name}:** \`${lineHeight.value}\``);
        }
        sections.push('');

        // Spacing
        sections.push('## Spacing', '');

        sections.push('### Spacing Scale', '');
        for (const spacing of content.spacing.scale) {
            sections.push(`- **${spacing.name}:** \`${spacing.value}\``);
        }
        sections.push('');

        sections.push('### Layout Grid', '');
        sections.push(`- **Columns:** ${content.spacing.layoutGrid.columns}`);
        sections.push(`- **Gutter:** \`${content.spacing.layoutGrid.gutter}\``);
        sections.push(`- **Margin:** \`${content.spacing.layoutGrid.margin}\``);
        sections.push('');

        // Components
        sections.push('## Components', '');

        sections.push('### Buttons', '');
        sections.push(`- **Variants:** ${content.components.buttons.variants.join(', ')}`);
        sections.push(`- **Sizes:** ${content.components.buttons.sizes.join(', ')}`);
        sections.push(`- **States:** ${content.components.buttons.states.join(', ')}`);
        sections.push('');

        sections.push('### Inputs', '');
        sections.push(`- **Types:** ${content.components.inputs.types.join(', ')}`);
        sections.push(`- **States:** ${content.components.inputs.states.join(', ')}`);
        sections.push('');

        sections.push('### Cards', '');
        sections.push(`- **Variants:** ${content.components.cards.variants.join(', ')}`);
        sections.push('');

        sections.push('### Navigation', '');
        sections.push(`- **Types:** ${content.components.navigation.types.join(', ')}`);
        sections.push('');

        // Responsive Breakpoints
        sections.push('## Responsive Breakpoints', '');
        for (const bp of content.responsiveBreakpoints) {
            sections.push(`- **${bp.name}:** \`${bp.minWidth}\` - ${bp.description}`);
        }
        sections.push('');

        return sections.join('\n');
    }

    /**
     * Generate Page Requirements document (Requirement 24.2)
     */
    public generatePageRequirements(content: PageRequirementsContent): string {
        const frontmatter = this.generateFrontmatter({
            document_type: 'page_requirements',
            project_name: content.projectName,
            generated_at: new Date().toISOString(),
            version: '1.0',
            traceability: {
                pages: [content.pageId],
                stories: content.overview.userStoriesAddressed.map(s => s.id),
            },
        });

        const sections: string[] = [
            frontmatter,
            `# Page: ${content.pageName}`,
            '',
            '## Overview',
            '',
            `**Purpose:** ${content.overview.purpose}`,
            '',
            '**User Stories Addressed:**',
            '',
        ];

        for (const story of content.overview.userStoriesAddressed) {
            sections.push(`- \`${story.id}\`: ${story.title}`);
        }
        sections.push('');

        // Layout
        sections.push('## Layout', '');
        sections.push(`**Structure:** ${content.layout.structure}`, '');

        sections.push('**Component Hierarchy:**', '');
        for (const comp of content.layout.componentHierarchy) {
            sections.push(`- ${comp}`);
        }
        sections.push('');

        // Components
        sections.push('## Components', '');
        for (const comp of content.components) {
            sections.push(`### ${comp.name}`, '');

            sections.push('**Props/Configuration:**', '');
            sections.push('```typescript');
            for (const [key, value] of Object.entries(comp.props)) {
                sections.push(`${key}: ${value}`);
            }
            sections.push('```', '');

            sections.push('**Behavior:**', '');
            for (const behavior of comp.behavior) {
                sections.push(`- ${behavior}`);
            }
            sections.push('');

            sections.push(`**Styling:** ${comp.stylingNotes} (See Style Guide)`, '');
        }

        // Data Requirements
        sections.push('## Data Requirements', '');

        sections.push('### State', '');
        if (content.dataRequirements.state.length > 0) {
            sections.push('| Name | Type | Description |');
            sections.push('|------|------|-------------|');
            for (const state of content.dataRequirements.state) {
                sections.push(`| ${state.name} | \`${state.type}\` | ${state.description} |`);
            }
        } else {
            sections.push('No local state required.');
        }
        sections.push('');

        sections.push('### API Calls', '');
        if (content.dataRequirements.apiCalls.length > 0) {
            for (const api of content.dataRequirements.apiCalls) {
                sections.push(`- **\`${api.method} ${api.endpoint}\`**: ${api.purpose}`);
            }
        } else {
            sections.push('No API calls required.');
        }
        sections.push('');

        sections.push('### Props from Parent', '');
        if (content.dataRequirements.propsFromParent.length > 0) {
            for (const prop of content.dataRequirements.propsFromParent) {
                sections.push(`- \`${prop.name}: ${prop.type}\``);
            }
        } else {
            sections.push('No props required.');
        }
        sections.push('');

        // User Interactions
        sections.push('## User Interactions', '');
        if (content.userInteractions.length > 0) {
            sections.push('| Event | Trigger | Action | Navigation |');
            sections.push('|-------|---------|--------|------------|');
            for (const interaction of content.userInteractions) {
                const nav = interaction.navigationTarget || '-';
                sections.push(`| ${interaction.event} | ${interaction.trigger} | ${interaction.action} | ${nav} |`);
            }
        } else {
            sections.push('No user interactions defined.');
        }
        sections.push('');

        // Accessibility
        sections.push('## Accessibility', '');

        sections.push('### ARIA Requirements', '');
        for (const aria of content.accessibility.ariaRequirements) {
            sections.push(`- ${aria}`);
        }
        sections.push('');

        sections.push('### Keyboard Navigation', '');
        for (const kb of content.accessibility.keyboardNavigation) {
            sections.push(`- ${kb}`);
        }
        sections.push('');

        return sections.join('\n');
    }

    /**
     * Generate User Flow document (Requirement 24.3)
     */
    public generateUserFlow(content: UserFlowContent): string {
        const frontmatter = this.generateFrontmatter({
            document_type: 'user_flow',
            project_name: content.projectName,
            generated_at: new Date().toISOString(),
            version: '1.0',
            traceability: {
                stories: content.relatedStoryIds,
                pages: [content.overview.startPage.id, content.overview.endPage.id],
            },
        });

        const sections: string[] = [
            frontmatter,
            `# User Flow: ${content.flowName}`,
            '',
            '## Overview',
            '',
            `- **Start Page:** ${content.overview.startPage.name} (\`${content.overview.startPage.id}\`)`,
            `- **End Page:** ${content.overview.endPage.name} (\`${content.overview.endPage.id}\`)`,
            `- **User Goal:** ${content.overview.userGoal}`,
            '',
            '## Steps',
            '',
        ];

        // Steps
        for (const step of content.steps) {
            sections.push(`### Step ${step.stepNumber}: ${step.action}`, '');
            sections.push(`- **Page:** ${step.page.name} (\`${step.page.id}\`)`);
            sections.push(`- **Trigger:** ${step.trigger}`);

            if (step.dataPassed.length > 0) {
                sections.push(`- **Data Passed:** ${step.dataPassed.join(', ')}`);
            }

            if (step.next) {
                sections.push(`- **Next:** ${step.next.name} (\`${step.next.id}\`)`);
            } else {
                sections.push('- **Next:** End of flow');
            }
            sections.push('');
        }

        // Conditional Paths
        if (content.conditionalPaths.length > 0) {
            sections.push('## Conditional Paths', '');
            for (const path of content.conditionalPaths) {
                sections.push(`### If ${path.condition}`, '');
                sections.push(`- **Path A:** ${path.pathA.description} → ${path.pathA.destination}`);
                sections.push(`- **Path B:** ${path.pathB.description} → ${path.pathB.destination}`);
                sections.push('');
            }
        }

        // Error Handling
        if (content.errorHandling.length > 0) {
            sections.push('## Error Handling', '');
            for (const error of content.errorHandling) {
                sections.push(`- **${error.scenario}:** ${error.recoveryPath}`);
            }
            sections.push('');
        }

        return sections.join('\n');
    }

    /**
     * Generate Task List document (Requirement 24.4)
     */
    public generateTaskList(content: TaskListContent): string {
        const taskIds = content.tasks.map(t => t.id);
        const storyIds = [...new Set(content.tasks.map(t => t.storyId))];
        const pageIds = [...new Set(content.tasks.map(t => t.pageId).filter(Boolean) as string[])];

        const frontmatter = this.generateFrontmatter({
            document_type: 'task_list',
            project_name: content.projectName,
            generated_at: new Date().toISOString(),
            version: '1.0',
            traceability: {
                tasks: taskIds,
                stories: storyIds,
                pages: pageIds,
            },
        });

        const sections: string[] = [
            frontmatter,
            `# Implementation Tasks: ${content.projectName}`,
            '',
            '## Overview',
            '',
            `- **Total Tasks:** ${content.overview.totalTasks}`,
            `- **Estimated Complexity:** ${content.overview.estimatedComplexity}`,
            `- **Total Estimated Hours:** ${content.overview.totalEstimatedHours}`,
            '',
            '## Tasks',
            '',
        ];

        // Group tasks by category
        const categorizedTasks: Record<string, typeof content.tasks> = {};
        for (const task of content.tasks) {
            if (!categorizedTasks[task.category]) {
                categorizedTasks[task.category] = [];
            }
            categorizedTasks[task.category].push(task);
        }

        for (const [category, tasks] of Object.entries(categorizedTasks)) {
            sections.push(`### ${this.capitalizeFirst(category)} Tasks`, '');

            for (const task of tasks) {
                sections.push(`#### Task ${task.id}: ${task.title}`, '');
                sections.push(`- **Priority:** ${task.priority}`);
                sections.push(`- **Complexity:** ${this.capitalizeFirst(task.complexity)}`);
                sections.push(`- **Estimated Hours:** ${task.estimatedHours}`);

                if (task.dependencies.length > 0) {
                    sections.push(`- **Dependencies:** ${task.dependencies.join(', ')}`);
                } else {
                    sections.push('- **Dependencies:** None');
                }

                sections.push(`- **Traceability:** Implements \`${task.storyId}\`${task.pageId ? `, \`${task.pageId}\`` : ''}`);
                sections.push('');
                sections.push(`**Description:** ${task.description}`, '');

                sections.push('**Acceptance Criteria:**', '');
                for (const criterion of task.acceptanceCriteria) {
                    sections.push(`- [ ] ${criterion}`);
                }
                sections.push('');

                if (task.technicalNotes) {
                    sections.push(`**Technical Notes:** ${task.technicalNotes}`, '');
                }
            }
        }

        return sections.join('\n');
    }

    /**
     * Generate Steering Document (Requirement 24.5)
     */
    public generateSteeringDocument(content: SteeringDocumentContent): string {
        const frontmatter = this.generateFrontmatter({
            document_type: 'steering',
            project_name: content.projectName,
            generated_at: new Date().toISOString(),
            version: '1.0',
        });

        const sections: string[] = [
            frontmatter,
            `# Steering Document: ${content.projectName}`,
            '',
            '## Project Overview',
            '',
            `- **Name:** ${content.projectOverview.name}`,
            `- **Description:** ${content.projectOverview.description}`,
            `- **Target Users:** ${content.projectOverview.targetUsers.join(', ')}`,
            `- **Core Value Proposition:** ${content.projectOverview.coreValueProposition}`,
            '',
            '## Technical Stack',
            '',
            `- **Framework:** ${content.technicalStack.framework}`,
            `- **Language:** ${content.technicalStack.language}`,
            `- **Styling:** ${content.technicalStack.styling}`,
            `- **State Management:** ${content.technicalStack.stateManagement}`,
            `- **Key Libraries:** ${content.technicalStack.keyLibraries.join(', ')}`,
            '',
            '## Coding Standards',
            '',
            '### Naming Conventions',
            '',
            `- **Components:** ${content.codingStandards.namingConventions.components}`,
            `- **Functions:** ${content.codingStandards.namingConventions.functions}`,
            `- **Files:** ${content.codingStandards.namingConventions.files}`,
            `- **Constants:** ${content.codingStandards.namingConventions.constants}`,
            '',
            '### File Organization',
            '',
            content.codingStandards.fileOrganization,
            '',
            '### Code Style',
            '',
            content.codingStandards.codeStyle,
            '',
            '## Architectural Patterns',
            '',
            '### Component Architecture',
            '',
            content.architecturalPatterns.componentArchitecture,
            '',
            '### State Management',
            '',
            content.architecturalPatterns.stateManagement,
            '',
            '### Data Flow',
            '',
            content.architecturalPatterns.dataFlow,
            '',
            '## Quality Requirements',
            '',
            '### Testing Strategy',
            '',
            content.qualityRequirements.testingStrategy,
            '',
            '### Accessibility Standards',
            '',
            content.qualityRequirements.accessibilityStandards,
            '',
            '### Performance Targets',
            '',
            `- **First Contentful Paint (FCP):** ${content.qualityRequirements.performanceTargets.firstContentfulPaint}`,
            `- **Largest Contentful Paint (LCP):** ${content.qualityRequirements.performanceTargets.largestContentfulPaint}`,
        ];

        if (content.qualityRequirements.performanceTargets.timeToInteractive) {
            sections.push(`- **Time to Interactive (TTI):** ${content.qualityRequirements.performanceTargets.timeToInteractive}`);
        }
        sections.push('');

        // Constraints
        sections.push('## Constraints', '');

        sections.push('### Technology Constraints', '');
        for (const constraint of content.constraints.technologyConstraints) {
            sections.push(`- ${constraint}`);
        }
        sections.push('');

        sections.push('### Scope Boundaries', '');
        for (const boundary of content.constraints.scopeBoundaries) {
            sections.push(`- ${boundary}`);
        }
        sections.push('');

        sections.push('### Out of Scope', '');
        for (const item of content.constraints.outOfScope) {
            sections.push(`- ${item}`);
        }
        sections.push('');

        return sections.join('\n');
    }

    /**
     * Get the file name for a document
     */
    public getFileName(documentType: DocumentType, identifier?: string): string {
        switch (documentType) {
            case 'style_guide':
                return 'style-guide.md';
            case 'page_requirements':
                return `page-${this.toKebabCase(identifier || 'unknown')}.md`;
            case 'user_flow':
                return `flow-${this.toKebabCase(identifier || 'unknown')}.md`;
            case 'task_list':
                return 'task-list.md';
            case 'steering':
                return 'steering-document.md';
            default:
                return `${documentType}.md`;
        }
    }

    /**
     * Get the full output path for a document
     */
    public getOutputPath(documentType: DocumentType, identifier?: string): string {
        return `${this.outputDir}/${this.getFileName(documentType, identifier)}`;
    }

    /**
     * Get the output directory
     */
    public getOutputDir(): string {
        return this.outputDir;
    }

    /**
     * Convert string to kebab-case
     */
    private toKebabCase(str: string): string {
        return str
            .replace(/([a-z])([A-Z])/g, '$1-$2')
            .replace(/[\s_]+/g, '-')
            .toLowerCase();
    }

    /**
     * Capitalize first letter
     */
    private capitalizeFirst(str: string): string {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

