/**
 * Settings Types
 *
 * Type definitions for the Settings feature.
 *
 * **Validates: Requirements 4.4**
 */

/**
 * API provider options
 */
export type ApiProvider = 'gemini' | 'bedrock';

/**
 * Available theme options
 */
export type ThemeOption = 'dark' | 'match-ide' | 'personaut';

/**
 * Artifact generation settings
 */
export interface ArtifactSettings {
    generateBackstories: boolean;
    generateFeedback: boolean;
    saveToWorkspace: boolean;
    outputFormat: 'markdown' | 'json';
}

/**
 * Complete settings interface
 */
export interface Settings {
    // Provider selection
    provider: ApiProvider;
    theme: ThemeOption;

    // Gemini settings
    geminiApiKey: string;
    geminiModel: string;
    openaiApiKey: string;

    // AWS Bedrock settings
    awsAccessKey: string;
    awsSecretKey: string;
    awsRegion: string;
    awsSessionToken: string;
    bedrockModel: string;
    bedrockUseVpcEndpoint: boolean;
    bedrockVpcEndpoint: string;
    bedrockCrossRegionInference: boolean;
    awsUseProfile: boolean;
    awsProfile: string;

    // Artifact settings
    artifacts: ArtifactSettings;

    // Rate limiting
    rateLimit: number;
    rateLimitWarningThreshold: number;

    // Automation settings
    autoRead: boolean;
    autoWrite: boolean;
    autoExecute: boolean;
}

/**
 * Settings section identifiers
 */
export type SettingsSection = 'general' | 'provider' | 'artifacts' | 'data' | 'about';

/**
 * Save status for settings
 */
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Default settings values
 */
export const DEFAULT_SETTINGS: Settings = {
    provider: 'gemini',
    theme: 'match-ide',
    geminiApiKey: '',
    geminiModel: 'gemini-2.5-flash',
    openaiApiKey: '',

    awsAccessKey: '',
    awsSecretKey: '',
    awsRegion: 'us-east-1',
    awsSessionToken: '',
    bedrockModel: 'anthropic.claude-sonnet-4-20250514-v1:0',
    bedrockUseVpcEndpoint: false,
    bedrockVpcEndpoint: '',
    bedrockCrossRegionInference: false,
    awsUseProfile: false,
    awsProfile: 'default',

    artifacts: {
        generateBackstories: true,
        generateFeedback: true,
        saveToWorkspace: false,
        outputFormat: 'markdown',
    },

    rateLimit: 100000,
    rateLimitWarningThreshold: 80,
    autoRead: true,
    autoWrite: true,
    autoExecute: true,
};

/**
 * Gemini model options
 */
export const GEMINI_MODELS = [
    { value: 'gemini-3-pro-preview', label: 'Gemini 3 Pro Preview (Most Powerful)', group: 'Gemini 3 (Latest)' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Default - Fast & Smart)', group: 'Gemini 2.5 (Recommended)' },
    { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite (Fastest & Cheapest)', group: 'Gemini 2.5 (Recommended)' },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Advanced Reasoning)', group: 'Gemini 2.5 (Recommended)' },
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (Stable)', group: 'Gemini 2.0' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', group: 'Legacy Models' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', group: 'Legacy Models' },
];

/**
 * Bedrock model options
 */
export const BEDROCK_MODELS = [
    { value: 'anthropic.claude-sonnet-4-20250514-v1:0', label: 'Claude Sonnet 4 (Latest)', group: 'Claude 4 (Latest)' },
    { value: 'anthropic.claude-opus-4-20250514-v1:0', label: 'Claude Opus 4', group: 'Claude 4 (Latest)' },
    { value: 'anthropic.claude-3-7-sonnet-20250219-v1:0', label: 'Claude 3.7 Sonnet', group: 'Claude 3.7' },
    { value: 'anthropic.claude-3-5-sonnet-20241022-v2:0', label: 'Claude 3.5 Sonnet v2', group: 'Claude 3.5' },
    { value: 'anthropic.claude-3-5-haiku-20241022-v1:0', label: 'Claude 3.5 Haiku', group: 'Claude 3.5' },
    { value: 'amazon.nova-premier-v1:0', label: 'Amazon Nova Premier', group: 'Amazon Nova' },
    { value: 'amazon.nova-pro-v1:0', label: 'Amazon Nova Pro', group: 'Amazon Nova' },
];

/**
 * AWS region options
 */
export const AWS_REGIONS = [
    { value: 'us-east-1', label: 'US East (N. Virginia)' },
    { value: 'us-east-2', label: 'US East (Ohio)' },
    { value: 'us-west-2', label: 'US West (Oregon)' },
    { value: 'eu-west-1', label: 'Europe (Ireland)' },
    { value: 'eu-west-2', label: 'Europe (London)' },
    { value: 'eu-central-1', label: 'Europe (Frankfurt)' },
    { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' },
    { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
    { value: 'ap-southeast-2', label: 'Asia Pacific (Sydney)' },
];
