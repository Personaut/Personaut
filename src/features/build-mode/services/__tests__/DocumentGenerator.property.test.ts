/**
 * DocumentGenerator Property Tests
 *
 * Property 13: Export Format Validity
 * - All generated documents are valid markdown
 * - YAML frontmatter is correctly formatted
 * - Heading hierarchy is consistent
 *
 * Property 15: Document Structure Completeness
 * - Page Requirements have all required sections
 * - References to Style Guide and Steering Document are present
 *
 * Property 16: Style Guide Completeness
 * - All required sections are present
 * - Color, typography, spacing, and component sections complete
 *
 * Property 17: Page Flow Structure
 * - Flows have start and end pages
 * - Steps include triggers and data transfer
 * - Conditional paths are valid
 *
 * Validates: Requirements 24.1-24.9, 8A.2-8A.6, 8B.2-8B.6, 8C.1-8C.4, 10.4, 11.4
 */

import {
    DocumentGenerator,
    DocumentFrontmatter,
    StyleGuideContent,
    PageRequirementsContent,
    UserFlowContent,
    TaskListContent,
    SteeringDocumentContent,
} from '../DocumentGenerator';

// ============================================================================
// Helper Functions
// ============================================================================

function createMockStyleGuide(): StyleGuideContent {
    return {
        projectName: 'Test Project',
        colorPalette: {
            primary: [
                { name: 'Primary Blue', value: '#2563eb', usage: 'Main brand color' },
                { name: 'Primary Light', value: '#3b82f6', usage: 'Hover states' },
            ],
            secondary: [
                { name: 'Secondary Gray', value: '#6b7280', usage: 'Secondary text' },
            ],
            semantic: {
                success: '#10b981',
                warning: '#f59e0b',
                error: '#ef4444',
                info: '#3b82f6',
            },
        },
        typography: {
            fontFamilies: {
                primary: 'Inter, sans-serif',
                secondary: 'Roboto, sans-serif',
                monospace: 'JetBrains Mono, monospace',
            },
            fontSizes: [
                { name: 'xs', size: '0.75rem', usage: 'Small labels' },
                { name: 'sm', size: '0.875rem', usage: 'Body text' },
                { name: 'base', size: '1rem', usage: 'Default text' },
                { name: 'lg', size: '1.125rem', usage: 'Emphasized text' },
                { name: 'xl', size: '1.25rem', usage: 'Subheadings' },
                { name: '2xl', size: '1.5rem', usage: 'Headings' },
            ],
            fontWeights: [
                { name: 'normal', weight: 400 },
                { name: 'medium', weight: 500 },
                { name: 'semibold', weight: 600 },
                { name: 'bold', weight: 700 },
            ],
            lineHeights: [
                { name: 'tight', value: '1.25' },
                { name: 'normal', value: '1.5' },
                { name: 'relaxed', value: '1.75' },
            ],
        },
        spacing: {
            scale: [
                { name: '1', value: '0.25rem' },
                { name: '2', value: '0.5rem' },
                { name: '4', value: '1rem' },
                { name: '8', value: '2rem' },
            ],
            layoutGrid: {
                columns: 12,
                gutter: '1rem',
                margin: '1.5rem',
            },
        },
        components: {
            buttons: {
                variants: ['primary', 'secondary', 'ghost', 'danger'],
                sizes: ['sm', 'md', 'lg'],
                states: ['default', 'hover', 'active', 'disabled'],
            },
            inputs: {
                types: ['text', 'email', 'password', 'textarea', 'select'],
                states: ['default', 'focus', 'error', 'disabled'],
            },
            cards: {
                variants: ['default', 'elevated', 'outlined'],
            },
            navigation: {
                types: ['navbar', 'sidebar', 'breadcrumb', 'tabs'],
            },
        },
        responsiveBreakpoints: [
            { name: 'sm', minWidth: '640px', description: 'Mobile landscape' },
            { name: 'md', minWidth: '768px', description: 'Tablet' },
            { name: 'lg', minWidth: '1024px', description: 'Desktop' },
            { name: 'xl', minWidth: '1280px', description: 'Large desktop' },
        ],
    };
}

function createMockPageRequirements(): PageRequirementsContent {
    return {
        pageName: 'Dashboard',
        projectName: 'Test Project',
        pageId: 'page-dashboard',
        overview: {
            purpose: 'Main user dashboard showing project overview and quick actions',
            userStoriesAddressed: [
                { id: 'story-001', title: 'View project status' },
                { id: 'story-002', title: 'Access recent items' },
            ],
        },
        layout: {
            structure: 'Two-column layout with sidebar navigation and main content area',
            componentHierarchy: [
                'Layout (flex container)',
                '├── Sidebar (navigation)',
                '├── Main Content',
                '    ├── Header',
                '    ├── Stats Grid',
                '    └── Recent Items List',
            ],
        },
        components: [
            {
                name: 'StatsCard',
                props: {
                    title: 'string',
                    value: 'number',
                    trend: "'up' | 'down' | 'neutral'",
                },
                behavior: [
                    'Displays a statistic with optional trend indicator',
                    'Clickable to view detailed stats',
                ],
                stylingNotes: 'Use card-elevated variant with primary accent border',
            },
            {
                name: 'RecentItemsList',
                props: {
                    items: 'RecentItem[]',
                    maxItems: 'number',
                },
                behavior: [
                    'Displays recent items in a scrollable list',
                    'Click to navigate to item detail',
                    'Lazy loads more items on scroll',
                ],
                stylingNotes: 'Use default card variant with list styling',
            },
        ],
        dataRequirements: {
            state: [
                { name: 'projects', type: 'Project[]', description: 'User projects' },
                { name: 'recentItems', type: 'RecentItem[]', description: 'Recently accessed items' },
            ],
            apiCalls: [
                { endpoint: '/api/projects', method: 'GET', purpose: 'Fetch user projects' },
                { endpoint: '/api/recent', method: 'GET', purpose: 'Fetch recent items' },
            ],
            propsFromParent: [
                { name: 'userId', type: 'string' },
            ],
        },
        userInteractions: [
            {
                event: 'Click project card',
                trigger: 'Mouse click or Enter key',
                action: 'Navigate to project detail',
                navigationTarget: 'page-project-detail',
            },
            {
                event: 'Click recent item',
                trigger: 'Mouse click',
                action: 'Open item in context',
            },
        ],
        accessibility: {
            ariaRequirements: [
                'Use aria-label for stats cards',
                'Use aria-live for loading states',
                'Ensure focus visible on all interactive elements',
            ],
            keyboardNavigation: [
                'Tab through cards and list items',
                'Enter to activate focused item',
                'Escape to close any open modals',
            ],
        },
    };
}

function createMockUserFlow(): UserFlowContent {
    return {
        flowName: 'User Registration',
        flowId: 'flow-registration',
        projectName: 'Test Project',
        overview: {
            startPage: { id: 'page-landing', name: 'Landing Page' },
            endPage: { id: 'page-dashboard', name: 'Dashboard' },
            userGoal: 'Create a new account and access the application',
        },
        steps: [
            {
                stepNumber: 1,
                action: 'Click Sign Up button',
                page: { id: 'page-landing', name: 'Landing Page' },
                trigger: 'Button click',
                dataPassed: [],
                next: { id: 'page-signup', name: 'Sign Up Page' },
            },
            {
                stepNumber: 2,
                action: 'Fill registration form',
                page: { id: 'page-signup', name: 'Sign Up Page' },
                trigger: 'Form submission',
                dataPassed: ['email', 'password', 'name'],
                next: { id: 'page-verification', name: 'Email Verification Page' },
            },
            {
                stepNumber: 3,
                action: 'Verify email',
                page: { id: 'page-verification', name: 'Email Verification Page' },
                trigger: 'Email link click',
                dataPassed: ['verification_token'],
                next: { id: 'page-dashboard', name: 'Dashboard' },
            },
        ],
        conditionalPaths: [
            {
                condition: 'Email already registered',
                pathA: { description: 'Show error message', destination: 'Stay on Sign Up Page' },
                pathB: { description: 'Suggest login', destination: 'Login Page' },
            },
        ],
        errorHandling: [
            { scenario: 'Network error during submission', recoveryPath: 'Retry with exponential backoff' },
            { scenario: 'Verification link expired', recoveryPath: 'Resend verification email' },
        ],
        relatedStoryIds: ['story-001', 'story-002', 'story-003'],
    };
}

function createMockTaskList(): TaskListContent {
    return {
        projectName: 'Test Project',
        overview: {
            totalTasks: 5,
            estimatedComplexity: 'Medium',
            totalEstimatedHours: 32,
        },
        tasks: [
            {
                id: 'task-001',
                title: 'Set up project structure',
                priority: 'P0',
                complexity: 'low',
                estimatedHours: 4,
                dependencies: [],
                storyId: 'story-001',
                description: 'Initialize the project with the chosen framework and configure build tools',
                acceptanceCriteria: [
                    'Project builds successfully',
                    'Linting configured and passing',
                    'CI/CD pipeline created',
                ],
                technicalNotes: 'Use Vite for faster builds',
                category: 'frontend',
            },
            {
                id: 'task-002',
                title: 'Create authentication system',
                priority: 'P0',
                complexity: 'high',
                estimatedHours: 12,
                dependencies: ['task-001'],
                storyId: 'story-002',
                pageId: 'page-login',
                description: 'Implement user authentication with login, signup, and password reset',
                acceptanceCriteria: [
                    'Users can register',
                    'Users can login',
                    'Password reset works',
                    'Session persists',
                ],
                technicalNotes: 'Use JWT for token management',
                category: 'backend',
            },
            {
                id: 'task-003',
                title: 'Build Dashboard UI',
                priority: 'P1',
                complexity: 'medium',
                estimatedHours: 8,
                dependencies: ['task-002'],
                storyId: 'story-003',
                pageId: 'page-dashboard',
                description: 'Create the main dashboard with stats cards and recent items',
                acceptanceCriteria: [
                    'Dashboard displays correctly',
                    'Stats load from API',
                    'Responsive design works',
                ],
                category: 'frontend',
            },
            {
                id: 'task-004',
                title: 'Create database schema',
                priority: 'P0',
                complexity: 'medium',
                estimatedHours: 4,
                dependencies: [],
                storyId: 'story-001',
                description: 'Design and implement the database schema for the application',
                acceptanceCriteria: [
                    'Schema supports all entities',
                    'Migrations work',
                    'Indexes optimized',
                ],
                category: 'database',
            },
            {
                id: 'task-005',
                title: 'Write unit tests',
                priority: 'P2',
                complexity: 'medium',
                estimatedHours: 4,
                dependencies: ['task-002', 'task-003'],
                storyId: 'story-004',
                description: 'Create unit tests for core business logic',
                acceptanceCriteria: [
                    'Coverage > 80%',
                    'All tests pass',
                    'Critical paths tested',
                ],
                category: 'testing',
            },
        ],
    };
}

function createMockSteeringDocument(): SteeringDocumentContent {
    return {
        projectName: 'Test Project',
        projectOverview: {
            name: 'Test Project',
            description: 'A comprehensive test application for validating the Design workflow',
            targetUsers: ['Developers', 'Product Managers', 'End Users'],
            coreValueProposition: 'Streamline design-to-implementation workflow',
        },
        technicalStack: {
            framework: 'React',
            language: 'TypeScript',
            styling: 'TailwindCSS',
            stateManagement: 'Zustand',
            keyLibraries: ['React Router', 'React Query', 'Zod', 'React Hook Form'],
        },
        codingStandards: {
            namingConventions: {
                components: 'PascalCase',
                functions: 'camelCase',
                files: 'kebab-case',
                constants: 'SCREAMING_SNAKE_CASE',
            },
            fileOrganization: 'Feature-based folder structure with shared components in /components',
            codeStyle: 'ESLint with Airbnb config, Prettier with 2-space indentation, single quotes',
        },
        architecturalPatterns: {
            componentArchitecture: 'Atomic Design (atoms, molecules, organisms, templates, pages)',
            stateManagement: 'Single store with domain-specific slices, React Query for server state',
            dataFlow: 'Unidirectional data flow with actions dispatched to store',
        },
        qualityRequirements: {
            testingStrategy: 'Unit tests with Jest, integration tests with Testing Library, E2E with Playwright',
            accessibilityStandards: 'WCAG 2.1 AA compliance, tested with axe-core',
            performanceTargets: {
                firstContentfulPaint: '<1.5s',
                largestContentfulPaint: '<2.5s',
                timeToInteractive: '<3.5s',
            },
        },
        constraints: {
            technologyConstraints: [
                'Must work offline with service worker',
                'Must support IE11 (polyfills allowed)',
            ],
            scopeBoundaries: [
                'Desktop and mobile web only',
                'English language only for MVP',
            ],
            outOfScope: [
                'Native mobile apps',
                'Backend development (use existing API)',
            ],
        },
    };
}

// ============================================================================
// TESTS
// ============================================================================

describe('DocumentGenerator Property Tests', () => {
    let generator: DocumentGenerator;

    beforeEach(() => {
        generator = new DocumentGenerator('Test Project');
    });

    // ========================================================================
    // Property 13: Export Format Validity
    // ========================================================================
    describe('Property 13: Export Format Validity', () => {
        describe('YAML Frontmatter', () => {
            it('should generate valid YAML frontmatter', () => {
                const frontmatter: DocumentFrontmatter = {
                    document_type: 'style_guide',
                    project_name: 'Test Project',
                    generated_at: '2024-01-01T00:00:00.000Z',
                    version: '1.0',
                };

                const result = generator.generateFrontmatter(frontmatter);

                expect(result).toMatch(/^---\n/);
                expect(result).toMatch(/---\n$/);
                expect(result).toContain('document_type: style_guide');
                expect(result).toContain('project_name: "Test Project"');
                expect(result).toContain('version: "1.0"');
            });

            it('should include traceability in frontmatter when provided', () => {
                const frontmatter: DocumentFrontmatter = {
                    document_type: 'task_list',
                    project_name: 'Test Project',
                    generated_at: '2024-01-01T00:00:00.000Z',
                    version: '1.0',
                    traceability: {
                        features: ['feature-001', 'feature-002'],
                        stories: ['story-001'],
                    },
                };

                const result = generator.generateFrontmatter(frontmatter);

                expect(result).toContain('traceability:');
                expect(result).toContain('features: ["feature-001", "feature-002"]');
                expect(result).toContain('stories: ["story-001"]');
            });
        });

        describe('Heading Hierarchy', () => {
            it('should use consistent heading hierarchy in style guide', () => {
                const content = createMockStyleGuide();
                const markdown = generator.generateStyleGuide(content);

                // H1 for title
                expect(markdown).toMatch(/^---\n[\s\S]*---\n\n# Style Guide: /m);

                // H2 for major sections
                expect(markdown).toContain('## Color Palette');
                expect(markdown).toContain('## Typography');
                expect(markdown).toContain('## Spacing');
                expect(markdown).toContain('## Components');

                // H3 for subsections
                expect(markdown).toContain('### Primary Colors');
                expect(markdown).toContain('### Font Families');
            });

            it('should use consistent heading hierarchy in page requirements', () => {
                const content = createMockPageRequirements();
                const markdown = generator.generatePageRequirements(content);

                expect(markdown).toMatch(/# Page: Dashboard/);
                expect(markdown).toContain('## Overview');
                expect(markdown).toContain('## Layout');
                expect(markdown).toContain('## Components');
                expect(markdown).toContain('## Data Requirements');
            });

            it('should use task lists for actionable items', () => {
                const content = createMockTaskList();
                const markdown = generator.generateTaskList(content);

                // Task lists use - [ ] format
                expect(markdown).toContain('- [ ]');
            });

            it('should use code blocks with language hints', () => {
                const content = createMockPageRequirements();
                const markdown = generator.generatePageRequirements(content);

                expect(markdown).toContain('```typescript');
                expect(markdown).toContain('```');
            });
        });

        describe('File Naming', () => {
            it('should generate kebab-case file names', () => {
                expect(generator.getFileName('style_guide')).toBe('style-guide.md');
                expect(generator.getFileName('task_list')).toBe('task-list.md');
                expect(generator.getFileName('steering')).toBe('steering-document.md');
            });

            it('should include identifier in page and flow file names', () => {
                expect(generator.getFileName('page_requirements', 'Dashboard')).toBe('page-dashboard.md');
                expect(generator.getFileName('user_flow', 'User Registration')).toBe('flow-user-registration.md');
            });

            it('should generate correct output paths', () => {
                const path = generator.getOutputPath('style_guide');
                expect(path).toBe('.personaut/design/test-project/style-guide.md');
            });
        });
    });

    // ========================================================================
    // Property 15: Document Structure Completeness
    // ========================================================================
    describe('Property 15: Document Structure Completeness', () => {
        describe('Page Requirements Document', () => {
            it('should have all required sections', () => {
                const content = createMockPageRequirements();
                const markdown = generator.generatePageRequirements(content);

                expect(markdown).toContain('## Overview');
                expect(markdown).toContain('## Layout');
                expect(markdown).toContain('## Components');
                expect(markdown).toContain('## Data Requirements');
                expect(markdown).toContain('## User Interactions');
                expect(markdown).toContain('## Accessibility');
            });

            it('should include user stories addressed', () => {
                const content = createMockPageRequirements();
                const markdown = generator.generatePageRequirements(content);

                expect(markdown).toContain('story-001');
                expect(markdown).toContain('story-002');
                expect(markdown).toContain('View project status');
            });

            it('should reference Style Guide in component styling', () => {
                const content = createMockPageRequirements();
                const markdown = generator.generatePageRequirements(content);

                expect(markdown).toContain('Style Guide');
            });

            it('should include component hierarchy', () => {
                const content = createMockPageRequirements();
                const markdown = generator.generatePageRequirements(content);

                expect(markdown).toContain('Component Hierarchy');
                expect(markdown).toContain('Layout');
                expect(markdown).toContain('Sidebar');
            });

            it('should include data requirements', () => {
                const content = createMockPageRequirements();
                const markdown = generator.generatePageRequirements(content);

                expect(markdown).toContain('### State');
                expect(markdown).toContain('### API Calls');
                expect(markdown).toContain('### Props from Parent');
            });

            it('should include accessibility requirements', () => {
                const content = createMockPageRequirements();
                const markdown = generator.generatePageRequirements(content);

                expect(markdown).toContain('### ARIA Requirements');
                expect(markdown).toContain('### Keyboard Navigation');
                expect(markdown).toContain('aria-label');
            });
        });
    });

    // ========================================================================
    // Property 16: Style Guide Completeness
    // ========================================================================
    describe('Property 16: Style Guide Completeness', () => {
        it('should have all required sections', () => {
            const content = createMockStyleGuide();
            const markdown = generator.generateStyleGuide(content);

            expect(markdown).toContain('## Color Palette');
            expect(markdown).toContain('## Typography');
            expect(markdown).toContain('## Spacing');
            expect(markdown).toContain('## Components');
            expect(markdown).toContain('## Responsive Breakpoints');
        });

        it('should include color palette with all color types', () => {
            const content = createMockStyleGuide();
            const markdown = generator.generateStyleGuide(content);

            expect(markdown).toContain('### Primary Colors');
            expect(markdown).toContain('### Secondary Colors');
            expect(markdown).toContain('### Semantic Colors');
            expect(markdown).toContain('Success');
            expect(markdown).toContain('Warning');
            expect(markdown).toContain('Error');
            expect(markdown).toContain('Info');
        });

        it('should include typography specifications', () => {
            const content = createMockStyleGuide();
            const markdown = generator.generateStyleGuide(content);

            expect(markdown).toContain('### Font Families');
            expect(markdown).toContain('### Font Sizes');
            expect(markdown).toContain('### Font Weights');
            expect(markdown).toContain('### Line Heights');
            expect(markdown).toContain('Inter');
        });

        it('should include spacing system', () => {
            const content = createMockStyleGuide();
            const markdown = generator.generateStyleGuide(content);

            expect(markdown).toContain('### Spacing Scale');
            expect(markdown).toContain('### Layout Grid');
            expect(markdown).toContain('Columns');
            expect(markdown).toContain('Gutter');
        });

        it('should include component specifications', () => {
            const content = createMockStyleGuide();
            const markdown = generator.generateStyleGuide(content);

            expect(markdown).toContain('### Buttons');
            expect(markdown).toContain('### Inputs');
            expect(markdown).toContain('### Cards');
            expect(markdown).toContain('### Navigation');
            expect(markdown).toContain('Variants');
            expect(markdown).toContain('States');
        });

        it('should include responsive breakpoints', () => {
            const content = createMockStyleGuide();
            const markdown = generator.generateStyleGuide(content);

            expect(markdown).toContain('sm');
            expect(markdown).toContain('md');
            expect(markdown).toContain('lg');
            expect(markdown).toContain('640px');
        });
    });

    // ========================================================================
    // Property 17: Page Flow Structure
    // ========================================================================
    describe('Property 17: Page Flow Structure', () => {
        it('should include start and end pages', () => {
            const content = createMockUserFlow();
            const markdown = generator.generateUserFlow(content);

            expect(markdown).toContain('Start Page');
            expect(markdown).toContain('End Page');
            expect(markdown).toContain('Landing Page');
            expect(markdown).toContain('Dashboard');
        });

        it('should include user goal', () => {
            const content = createMockUserFlow();
            const markdown = generator.generateUserFlow(content);

            expect(markdown).toContain('User Goal');
            expect(markdown).toContain('Create a new account');
        });

        it('should include all steps with required information', () => {
            const content = createMockUserFlow();
            const markdown = generator.generateUserFlow(content);

            expect(markdown).toContain('## Steps');
            expect(markdown).toContain('### Step 1');
            expect(markdown).toContain('### Step 2');
            expect(markdown).toContain('### Step 3');
            expect(markdown).toContain('**Trigger:**');
            expect(markdown).toContain('**Data Passed:**');
            expect(markdown).toContain('**Next:**');
        });

        it('should include conditional paths', () => {
            const content = createMockUserFlow();
            const markdown = generator.generateUserFlow(content);

            expect(markdown).toContain('## Conditional Paths');
            expect(markdown).toContain('If Email already registered');
            expect(markdown).toContain('Path A');
            expect(markdown).toContain('Path B');
        });

        it('should include error handling', () => {
            const content = createMockUserFlow();
            const markdown = generator.generateUserFlow(content);

            expect(markdown).toContain('## Error Handling');
            expect(markdown).toContain('Network error');
            expect(markdown).toContain('Verification link expired');
        });

        it('should include traceability to stories', () => {
            const content = createMockUserFlow();
            const markdown = generator.generateUserFlow(content);

            expect(markdown).toContain('story-001');
            expect(markdown).toContain('story-002');
        });
    });

    // ========================================================================
    // Task List Document Tests
    // ========================================================================
    describe('Task List Document', () => {
        it('should include overview with totals', () => {
            const content = createMockTaskList();
            const markdown = generator.generateTaskList(content);

            expect(markdown).toContain('## Overview');
            expect(markdown).toContain('Total Tasks');
            expect(markdown).toContain('Estimated Complexity');
            expect(markdown).toContain('Total Estimated Hours');
        });

        it('should group tasks by category', () => {
            const content = createMockTaskList();
            const markdown = generator.generateTaskList(content);

            expect(markdown).toContain('### Frontend Tasks');
            expect(markdown).toContain('### Backend Tasks');
            expect(markdown).toContain('### Database Tasks');
            expect(markdown).toContain('### Testing Tasks');
        });

        it('should include all task metadata', () => {
            const content = createMockTaskList();
            const markdown = generator.generateTaskList(content);

            expect(markdown).toContain('**Priority:**');
            expect(markdown).toContain('**Complexity:**');
            expect(markdown).toContain('**Estimated Hours:**');
            expect(markdown).toContain('**Dependencies:**');
            expect(markdown).toContain('**Traceability:**');
        });

        it('should include acceptance criteria as task lists', () => {
            const content = createMockTaskList();
            const markdown = generator.generateTaskList(content);

            expect(markdown).toContain('**Acceptance Criteria:**');
            expect(markdown).toContain('- [ ]');
        });

        it('should include technical notes when present', () => {
            const content = createMockTaskList();
            const markdown = generator.generateTaskList(content);

            expect(markdown).toContain('**Technical Notes:**');
            expect(markdown).toContain('Use Vite');
        });
    });

    // ========================================================================
    // Steering Document Tests
    // ========================================================================
    describe('Steering Document', () => {
        it('should have all required sections', () => {
            const content = createMockSteeringDocument();
            const markdown = generator.generateSteeringDocument(content);

            expect(markdown).toContain('## Project Overview');
            expect(markdown).toContain('## Technical Stack');
            expect(markdown).toContain('## Coding Standards');
            expect(markdown).toContain('## Architectural Patterns');
            expect(markdown).toContain('## Quality Requirements');
            expect(markdown).toContain('## Constraints');
        });

        it('should include project overview details', () => {
            const content = createMockSteeringDocument();
            const markdown = generator.generateSteeringDocument(content);

            expect(markdown).toContain('**Name:**');
            expect(markdown).toContain('**Description:**');
            expect(markdown).toContain('**Target Users:**');
            expect(markdown).toContain('**Core Value Proposition:**');
        });

        it('should include technical stack details', () => {
            const content = createMockSteeringDocument();
            const markdown = generator.generateSteeringDocument(content);

            expect(markdown).toContain('**Framework:** React');
            expect(markdown).toContain('**Language:** TypeScript');
            expect(markdown).toContain('**Styling:** TailwindCSS');
            expect(markdown).toContain('**State Management:** Zustand');
        });

        it('should include coding standards', () => {
            const content = createMockSteeringDocument();
            const markdown = generator.generateSteeringDocument(content);

            expect(markdown).toContain('### Naming Conventions');
            expect(markdown).toContain('PascalCase');
            expect(markdown).toContain('camelCase');
            expect(markdown).toContain('kebab-case');
        });

        it('should include quality requirements', () => {
            const content = createMockSteeringDocument();
            const markdown = generator.generateSteeringDocument(content);

            expect(markdown).toContain('### Testing Strategy');
            expect(markdown).toContain('### Accessibility Standards');
            expect(markdown).toContain('### Performance Targets');
            expect(markdown).toContain('WCAG');
            expect(markdown).toContain('FCP');
            expect(markdown).toContain('LCP');
        });

        it('should include constraints', () => {
            const content = createMockSteeringDocument();
            const markdown = generator.generateSteeringDocument(content);

            expect(markdown).toContain('### Technology Constraints');
            expect(markdown).toContain('### Scope Boundaries');
            expect(markdown).toContain('### Out of Scope');
        });
    });
});
