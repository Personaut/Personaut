/**
 * WorkflowState Types and Interfaces
 * 
 * Defines the state structure for the iterative build workflow.
 * Supports checkpoint-based recovery, token tracking, and context management.
 * 
 * Feature: build-agent-architecture-review
 * Validates: Requirements AC-04.1
 */

/**
 * Iteration status during the build workflow
 */
export type IterationStatus =
    | 'designing'              // DesignerAgent creating UX spec
    | 'developing'             // DeveloperAgent implementing code
    | 'reviewing'              // ReviewerAgents providing feedback
    | 'consolidating'          // SummarizerAgent consolidating feedback
    | 'awaiting-user-decision' // Waiting for user to approve/iterate
    | 'complete';              // Iteration finished

/**
 * Workflow status
 */
export type WorkflowStatus =
    | 'in-progress'  // Workflow is actively running
    | 'paused'       // Workflow is paused (can be resumed)
    | 'complete'     // Workflow completed successfully
    | 'failed';      // Workflow failed with errors

/**
 * Checkpoint step identifier
 */
export type CheckpointStep =
    | 'framework-initialized'
    | 'page-started'
    | 'iteration-started'
    | 'ux-spec-created'
    | 'code-implemented'
    | 'screenshot-captured'
    | 'feedback-collected'
    | 'feedback-consolidated'
    | 'iteration-complete'
    | 'page-complete';

/**
 * Workflow error entry
 */
export interface WorkflowError {
    /** Unique error ID */
    id: string;

    /** Error timestamp */
    timestamp: number;

    /** Error severity */
    severity: 'warning' | 'error' | 'critical';

    /** Error message */
    message: string;

    /** Error stack trace */
    stack?: string;

    /** Context where error occurred */
    context: {
        pageId?: string;
        iteration?: number;
        step?: CheckpointStep;
        agentType?: string;
    };

    /** Whether error is recoverable */
    recoverable: boolean;

    /** Recovery instructions */
    recoveryInstructions?: string;
}

/**
 * Token usage report for a specific scope
 */
export interface TokenUsageReport {
    /** Input tokens consumed */
    inputTokens: number;

    /** Output tokens generated */
    outputTokens: number;

    /** Total tokens (input + output) */
    totalTokens: number;

    /** Timestamp of usage */
    timestamp: number;

    /** Agent type that consumed tokens */
    agentType?: string;

    /** Operation that consumed tokens */
    operation?: string;
}

/**
 * Checkpoint for workflow recovery
 */
export interface Checkpoint {
    /** Unique checkpoint ID */
    id: string;

    /** Checkpoint timestamp */
    timestamp: number;

    /** Checkpoint step */
    step: CheckpointStep;

    /** Page ID at checkpoint */
    pageId: string;

    /** Iteration number at checkpoint */
    iteration: number;

    /** Workflow state snapshot */
    stateSnapshot: Partial<WorkflowState>;

    /** Token usage at checkpoint */
    tokenUsage: {
        currentPage: number;
        currentIteration: number;
        totalWorkflow: number;
    };

    /** Whether checkpoint is valid for recovery */
    isValid: boolean;

    /** Checkpoint file path */
    filePath?: string;
}

/**
 * Iteration state for a single iteration
 */
export interface IterationState {
    /** Iteration number (1-indexed) */
    iteration: number;

    /** Iteration status */
    status: IterationStatus;

    /** Current step in iteration */
    currentStep: CheckpointStep;

    /** Iteration start time */
    startTime: number;

    /** Iteration end time */
    endTime?: number;

    /** UX spec checksum */
    uxSpecChecksum?: string;

    /** Code checksum */
    codeChecksum?: string;

    /** Screenshot path */
    screenshotPath?: string;

    /** Feedback summary */
    feedbackSummary?: {
        averageRating: number;
        consolidatedFeedback: string;
        reviewerCount: number;
    };

    /** Decision made */
    decision?: 'iterate-again' | 'move-to-next-page';

    /** Decision reason */
    decisionReason?: string;

    /** Token usage for this iteration */
    tokenUsage: TokenUsageReport[];

    /** Errors encountered */
    errors: WorkflowError[];
}

/**
 * Page state for a single page
 */
export interface PageState {
    /** Page ID */
    pageId: string;

    /** Page name */
    pageName: string;

    /** Page index (0-indexed) */
    pageIndex: number;

    /** Page status */
    status: 'pending' | 'in-progress' | 'complete' | 'failed';

    /** Page start time */
    startTime?: number;

    /** Page end time */
    endTime?: number;

    /** Iterations for this page */
    iterations: IterationState[];

    /** Current iteration number */
    currentIteration: number;

    /** Maximum iterations allowed */
    maxIterations: number;

    /** Token usage for this page */
    tokenUsage: {
        total: number;
        byIteration: number[];
    };

    /** Final decision */
    finalDecision?: 'approved' | 'max-iterations-reached';
}

/**
 * Main workflow state
 */
export interface WorkflowState {
    /** Unique workflow ID */
    workflowId: string;

    /** Project name */
    projectName: string;

    /** Workflow status */
    status: WorkflowStatus;

    /** Workflow start time */
    startTime: number;

    /** Last update time */
    lastUpdateTime: number;

    /** Schema version for migration support */
    schemaVersion: '1.0.0';

    /** Current page information */
    currentPage: {
        pageId: string;
        pageName: string;
        pageIndex: number;
        totalPages: number;
    };

    /** Current iteration information */
    currentIteration: {
        iteration: number;
        status: IterationStatus;
        currentStep: CheckpointStep;
        startTime: number;
    };

    /** Checkpoints for recovery */
    checkpoints: Checkpoint[];

    /** Page states */
    pages: PageState[];

    /** Token usage tracking */
    tokenUsage: {
        /** Tokens used on current page */
        currentPage: number;

        /** Tokens used in current iteration */
        currentIteration: number;

        /** Total tokens used in workflow */
        totalWorkflow: number;

        /** Estimated remaining tokens */
        estimatedRemaining: number;

        /** Token budget (optional) */
        budget?: number;

        /** Whether budget warning has been shown */
        budgetWarningShown: boolean;
    };

    /** Workflow errors */
    errors: WorkflowError[];

    /** Recovery information */
    recovery: {
        /** Last successful checkpoint ID */
        lastSuccessfulCheckpoint: string;

        /** Whether workflow can be resumed */
        canResume: boolean;

        /** Instructions for resuming */
        resumeInstructions: string;
    };

    /** Context management metadata */
    contextManagement: {
        /** Sliding window depth (number of iterations to keep) */
        slidingWindowDepth: number;

        /** Last summarization timestamp */
        lastSummarizationTime: number;

        /** Compression ratio achieved */
        compressionRatioAchieved: number;

        /** Number of context overflow events */
        contextOverflowCount: number;
    };
}

/**
 * Iteration summary for sliding window context
 */
export interface IterationSummary {
    /** Page ID */
    pageId: string;

    /** Iteration number */
    iteration: number;

    /** Summary timestamp */
    timestamp: number;

    /** Summary content */
    summary: {
        /** Design highlights (max 3 bullet points) */
        designHighlights: string[];

        /** Feedback highlights */
        feedbackHighlights: {
            rating: number;
            topIssue: string;
            topStrength: string;
        };

        /** Changes from previous iteration (one sentence) */
        changesFromPrevious: string;

        /** Decision made */
        decision: 'iterate-again' | 'move-to-next-page';

        /** Decision reason */
        decisionReason?: string;
    };

    /** References to artifacts */
    references: {
        uxSpecChecksum: string;
        codeChecksum: string;
        screenshotPath: string;
    };

    /** Original token count before summarization */
    originalTokens: number;

    /** Token count after summarization */
    summarizedTokens: number;
}

/**
 * Raw feedback from a single reviewer (file-persisted)
 */
export interface RawFeedback {
    /** Persona ID */
    personaId: string;

    /** Persona name */
    personaName: string;

    /** Persona role */
    personaRole: string;

    /** Feedback timestamp */
    timestamp: number;

    /** Ratings */
    ratings: {
        overall: number;
        usability: number;
        aesthetics: number;
        functionality: number;
        accessibility: number;
    };

    /** Feedback content */
    feedback: {
        likes: string[];
        dislikes: string[];
        suggestions: string[];
        concerns: string[];
    };

    /** Component-specific feedback */
    componentFeedback: Array<{
        componentId: string;
        componentName: string;
        rating: number;
        comments: string;
    }>;

    /** Review duration in milliseconds */
    reviewDuration: number;

    /** Token usage for this review */
    tokenUsage: number;
}

// ============================================================================
// DESIGN WORKFLOW TRACEABILITY TYPES
// Added for Build-to-Design transformation
// ============================================================================

/**
 * Type of tracked item in the Design workflow
 */
export type TrackedItemType = 'feature' | 'story' | 'page' | 'flow' | 'task';

/**
 * Type of link between tracked items
 */
export type LinkType =
    | 'story-to-feature'      // UserStory linked to Feature
    | 'page-to-story'         // Page linked to UserStory (many-to-many)
    | 'task-to-story'         // Task linked to UserStory
    | 'task-to-page'          // Task linked to Page
    | 'flow-step'             // PageFlow step connection
    | 'task-dependency';      // Task depends on another Task

/**
 * A link between two tracked items
 */
export interface TraceabilityLink {
    /** Source item ID */
    fromId: string;

    /** Target item ID */
    toId: string;

    /** Type of link */
    linkType: LinkType;

    /** When the link was created */
    createdAt: number;

    /** When the link was last verified */
    verifiedAt?: number;
}

/**
 * Map of all traceability links in a Design workflow
 */
export interface TraceabilityMap {
    /** All links in the workflow */
    links: TraceabilityLink[];

    /** Index of links by source ID for fast lookup */
    bySourceId: Record<string, TraceabilityLink[]>;

    /** Index of links by target ID for fast lookup */
    byTargetId: Record<string, TraceabilityLink[]>;

    /** Index of links by type for fast lookup */
    byLinkType: Record<LinkType, TraceabilityLink[]>;

    /** When the map was last updated */
    lastUpdated: number;
}

/**
 * Base interface for any item that can be tracked
 * All design workflow items (Feature, Story, Page, Task, etc.) should extend this
 */
export interface TrackedItem {
    /** Unique ID in format: {type}-{uuid} */
    id: string;

    /** Type of the tracked item */
    itemType: TrackedItemType;

    /** Whether this item has been modified by the user */
    isUserModified: boolean;

    /** When the item was created */
    createdAt: number;

    /** When the item was last modified */
    modifiedAt: number;
}

/**
 * Extended Design workflow state that includes traceability
 */
export interface DesignWorkflowState {
    /** Unique workflow ID */
    workflowId: string;

    /** Project name */
    projectName: string;

    /** Project description */
    projectDescription: string;

    /** Current stage in the Design workflow */
    currentStage: DesignStageName;

    /** Completed stages */
    completedStages: DesignStageName[];

    /** Stage data by stage ID */
    stageData: Record<DesignStageName, DesignStageData>;

    /** Traceability map for cross-referencing items */
    traceability: TraceabilityMap;

    /** Token usage by stage */
    tokenUsage: TokenUsageByStage;

    /** When the workflow was created */
    createdAt: number;

    /** When the workflow was last updated */
    updatedAt: number;

    /** Schema version for migration support */
    schemaVersion: '2.0.0';
}

/**
 * Design workflow stage names
 */
export type DesignStageName = 'idea' | 'users' | 'features' | 'stories' | 'design' | 'finalize';

/**
 * Base stage data interface
 */
export interface DesignStageData {
    /** When the stage was completed */
    completedAt?: number;

    /** Stage-specific data */
    [key: string]: unknown;
}

/**
 * Token usage tracked by stage
 */
export interface TokenUsageByStage {
    /** Token usage per stage */
    byStage: Record<DesignStageName, number>;

    /** Total tokens used */
    total: number;

    /** Token budget (optional) */
    budget?: number;

    /** Whether budget warning has been shown */
    budgetWarningShown: boolean;
}

/**
 * Validation result for traceability operations
 */
export interface TraceabilityValidationResult {
    /** Whether the validation passed */
    isValid: boolean;

    /** Validation errors */
    errors: Array<{
        code: string;
        message: string;
        itemId?: string;
        linkType?: LinkType;
    }>;

    /** Validation warnings */
    warnings: Array<{
        code: string;
        message: string;
        itemId?: string;
    }>;
}

/**
 * Create an empty traceability map
 */
export function createEmptyTraceabilityMap(): TraceabilityMap {
    return {
        links: [],
        bySourceId: {},
        byTargetId: {},
        byLinkType: {
            'story-to-feature': [],
            'page-to-story': [],
            'task-to-story': [],
            'task-to-page': [],
            'flow-step': [],
            'task-dependency': [],
        },
        lastUpdated: Date.now(),
    };
}

/**
 * Generate a unique ID for a tracked item
 * @param type - Type of item
 * @returns Unique ID in format: {type}-{uuid}
 */
export function generateTrackedId(type: TrackedItemType): string {
    const uuid = crypto.randomUUID ? crypto.randomUUID() :
        'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    return `${type}-${uuid.slice(0, 8)}`;
}
