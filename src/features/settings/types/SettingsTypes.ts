/**
 * Settings feature type definitions
 *
 * Feature: feature-based-architecture
 * Validates: Requirements 6.5
 */

/**
 * Settings configuration for the extension
 */
export interface Settings {
  provider: 'nativeIde' | 'gemini' | 'bedrock';
  theme: 'dark' | 'match-ide' | 'personaut';
  autoRead: boolean;
  autoWrite: boolean;
  autoExecute: boolean;
  geminiApiKey?: string;
  geminiModel?: string;
  awsAccessKey?: string;
  awsSecretKey?: string;
  awsSessionToken?: string;
  awsRegion?: string;
  awsProfile?: string;
  awsUseProfile?: boolean;
  bedrockModel?: string;
  bedrockUseVpcEndpoint?: boolean;
  bedrockVpcEndpoint?: string;
  bedrockCrossRegionInference?: boolean;
  rateLimit?: number;
  rateLimitWarningThreshold?: number;
  // Chat settings
  userMessageColor?: string;
  agentMessageColor?: string;
}

/**
 * Settings message types for webview communication
 */
export type SettingsMessageType = 'get-settings' | 'save-settings' | 'reset-settings';

/**
 * Settings webview message structure
 */
export interface SettingsMessage {
  type: SettingsMessageType;
  settings?: Partial<Settings>;
}
