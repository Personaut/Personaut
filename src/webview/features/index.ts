/**
 * Webview feature components
 * Organized by business feature for maintainability
 *
 * Requirements: 1.5
 */

// Export main feature views
export { ChatView } from './chat';
export { FeedbackView } from './feedback';
export { SettingsView } from './settings';
export { BuildView } from './build';
export { UserBaseView } from './userbase';

// Re-export feature modules for direct access
export * as chat from './chat';
export * as feedback from './feedback';
export * as settings from './settings';
export * as build from './build';
export * as userbase from './userbase';
