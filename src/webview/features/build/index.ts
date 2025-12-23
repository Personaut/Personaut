/**
 * Build Feature
 *
 * Provides the build mode functionality for creating new projects
 * through a multi-stage wizard: Idea → Team → Users → Features →
 * Stories → Design → Build.
 */

// Main View
export { BuildView } from './BuildView';
export type { BuildViewProps } from './BuildView';

// Components
export * from './components';

// Hooks
export * from './hooks';

// Stages
export * from './stages';

// Types (exported selectively to avoid naming conflicts)
export type {
    BuildStage,
    Framework,
    Demographics,
    GeneratedPersona,
    GeneratedFeature,
    UserStory,
    UserFlow,
    Screen,
    BuildData,
    SurveyResponse,
    StageFileData,
    IterationState,
    BuildState,
    BuildLogEntry,
    StageInfo,
} from './types';
export { BUILD_STAGES, FRAMEWORKS, INITIAL_BUILD_STATE, DEFAULT_BUILD_DATA, STAGE_INFO } from './types';

// Utils
export * from './utils';
