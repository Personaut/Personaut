/**
 * Build Feature Types
 *
 * Type definitions for the Build feature.
 *
 * **Validates: Requirements 13.2, 16.5, 27.1**
 */

/**
 * Build stages in order
 */
export const BUILD_STAGES = [
    'idea',
    'team',
    'users',
    'features',
    'stories',
    'design',
    'building',
] as const;

export type BuildStage = (typeof BUILD_STAGES)[number];

/**
 * Framework options for development
 */
export const FRAMEWORKS = ['react', 'flutter', 'html', 'vue', 'nextjs'] as const;
export type Framework = (typeof FRAMEWORKS)[number];

/**
 * User demographics
 */
export interface Demographics {
    ageRange: string;
    incomeRange: string;
    gender: string;
    location: string;
    education: string;
    occupation: string;
}

/**
 * Generated persona from demographics
 */
export interface GeneratedPersona {
    id: string;
    name: string;
    age: string;
    occupation: string;
    backstory: string;
    attributes?: Record<string, string>;
}

/**
 * Generated feature from user interviews
 */
export interface GeneratedFeature {
    id?: string;
    name: string;
    description: string;
    score: number;
    frequency: string;
    priority: string;
    mentionedBy?: string[]; // Personas who mentioned this feature
    personas?: string[]; // Alias for mentionedBy (for backward compatibility)
    reasoning?: string; // Why this feature has this priority
    surveyResponses?: Array<{
        personaId: string;
        personaName: string;
        feedback: string;
    }>;
}

/**
 * User story with requirements and criteria
 */
export interface UserStory {
    id: string;
    title: string;
    description: string;
    requirements: string[];
    acceptanceCriteria?: string[];
    clarifyingQuestions: { question: string; answer: string }[];
    answers?: Record<string, string>;
    featureId?: string | null;
    personaId?: string | null;
    expanded: boolean;
}

/**
 * User flow from UX design
 */
export interface UserFlow {
    id: string;
    name: string;
    steps: string[];
    description: string;
}

/**
 * Screen design from UX agent
 */
export interface Screen {
    id: string;
    name: string;
    description: string;
    components: string[];
    flowId?: string;
    screenshot?: string;
    uxSpec?: string;
}

/**
 * Build data structure
 */
export interface BuildData {
    team: string[];
    idea: string;
    users: {
        demographics: Demographics;
        description: string;
    };
    features: string[];
    design: string;
}

/**
 * Survey response for requirements gathering
 */
export interface SurveyResponse {
    personaId: string;
    question: string;
    answer: string;
    interviewTranscript: string;
    features: string[];
}

/**
 * Stage file data for persistence
 */
export interface StageFileData {
    stage: BuildStage;
    timestamp: number;
    data: unknown;
}

/**
 * Build iteration state
 */
export interface IterationState {
    currentIteration: number;
    totalIterations: number;
    isComplete: boolean;
    isStopping?: boolean; // True when stop has been requested
    isPaused?: boolean; // True when build has been paused
    lastError?: string;
}

/**
 * Complete build state
 */
export interface BuildState {
    // Navigation
    currentStage: BuildStage;
    completedStages: BuildStage[];

    // Project info
    projectName: string;
    projectTitle: string;
    codeFolderName: string;

    // Build data
    buildData: BuildData;

    // Users stage
    usersMode: 'personas' | 'demographics';
    buildPersonas: GeneratedPersona[];
    selectedPersonaIds: string[];
    generatedPersonas: GeneratedPersona[];

    // Features stage
    featuresMode: 'define' | 'generate';
    surveyResponses: SurveyResponse[];
    generatedFeatures: GeneratedFeature[];

    // Stories stage
    userStories: UserStory[];

    // Design stage
    userFlows: UserFlow[];
    generatedScreens: Screen[];
    selectedFramework: Framework;

    // Dev flow
    devFlowOrder: string[];

    // Loading states
    isLoading: boolean;
    loadingStage: BuildStage | null;

    // Iteration
    iteration: IterationState;
}

/**
 * Default build data
 */
export const DEFAULT_BUILD_DATA: BuildData = {
    team: ['UX', 'Developer'],
    idea: '',
    users: {
        demographics: {
            ageRange: '',
            incomeRange: '',
            gender: '',
            location: '',
            education: '',
            occupation: '',
        },
        description: '',
    },
    features: [],
    design: '',
};

/**
 * Initial build state
 */
export const INITIAL_BUILD_STATE: BuildState = {
    currentStage: 'idea',
    completedStages: [],
    projectName: '',
    projectTitle: '',
    codeFolderName: '',
    buildData: DEFAULT_BUILD_DATA,
    usersMode: 'personas',
    buildPersonas: [],
    selectedPersonaIds: [],
    generatedPersonas: [],
    featuresMode: 'define',
    surveyResponses: [],
    generatedFeatures: [],
    userStories: [],
    userFlows: [],
    generatedScreens: [],
    selectedFramework: 'react',
    devFlowOrder: ['UX', 'Developer'],
    isLoading: false,
    loadingStage: null,
    iteration: {
        currentIteration: 0,
        totalIterations: 0,
        isComplete: false,
    },
};

/**
 * Build log entry
 */
export interface BuildLogEntry {
    id: string;
    timestamp: number;
    type: 'user' | 'assistant' | 'system' | 'error' | 'info' | 'success' | 'warning';
    stage: BuildStage;
    content: string;
    metadata?: {
        model?: string;
        tokens?: number;
        duration?: number;
    };
}

/**
 * Stage display info
 */
export interface StageInfo {
    id: BuildStage;
    label: string;
    description: string;
    icon: string;
}

/**
 * Stage metadata for display
 */
export const STAGE_INFO: Record<BuildStage, StageInfo> = {
    idea: {
        id: 'idea',
        label: 'Idea',
        description: 'Define your project concept',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>',
    },
    team: {
        id: 'team',
        label: 'Team',
        description: 'Configure development workflow',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    },
    users: {
        id: 'users',
        label: 'Users',
        description: 'Define target users and personas',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="12" y1="2" x2="12" y2="6"/></svg>',
    },
    features: {
        id: 'features',
        label: 'Features',
        description: 'Define key features through user interviews',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    },
    stories: {
        id: 'stories',
        label: 'Stories',
        description: 'Generate user stories with requirements',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
    },
    design: {
        id: 'design',
        label: 'Design',
        description: 'Create UX flows and screen designs',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>',
    },
    building: {
        id: 'building',
        label: 'Build',
        description: 'Generate and iterate on code',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
    },
};

