/**
 * Message Router
 *
 * Routes incoming VS Code messages to feature-specific handlers
 * using type-safe discriminated unions.
 *
 * **Validates: Requirements 16.1, 16.2, 27.4**
 */

import type { VSCodeMessage } from '../types/messages';

/**
 * Feature-specific message handler
 */
export type FeatureHandler<T extends VSCodeMessage = VSCodeMessage> = (message: T) => void;

/**
 * Route configuration
 */
export interface RouteConfig {
    /** Chat feature handlers */
    chat?: FeatureHandler[];
    /** Build feature handlers */
    build?: FeatureHandler[];
    /** Feedback feature handlers */
    feedback?: FeatureHandler[];
    /** Settings handlers */
    settings?: FeatureHandler[];
    /** Global handlers (receive all messages) */
    global?: FeatureHandler[];
}

/**
 * Message type to feature mapping
 */
const MESSAGE_FEATURE_MAP: Record<string, keyof RouteConfig> = {
    // Chat messages
    'add-message': 'chat',
    'clear-chat': 'chat',
    'stream-start': 'chat',
    'stream-chunk': 'chat',
    'stream-end': 'chat',
    'tool-call': 'chat',
    'tool-result': 'chat',

    // Build messages
    'build-started': 'build',
    'build-completed': 'build',
    'build-error': 'build',
    'stage-data-loaded': 'build',
    'stage-data-saved': 'build',
    'personas-generated': 'build',
    'features-generated': 'build',
    'stories-generated': 'build',
    'flows-generated': 'build',
    'screens-generated': 'build',
    'iteration-update': 'build',

    // Feedback messages
    'feedback-generated': 'feedback',
    'screenshot-captured': 'feedback',

    // Settings messages
    'settings-updated': 'settings',
    'api-key-saved': 'settings',
};

/**
 * Create a message router
 *
 * @example
 * ```tsx
 * const router = createMessageRouter({
 *   chat: [handleChatMessage],
 *   build: [handleBuildMessage],
 *   global: [logAllMessages],
 * });
 *
 * // In useEffect
 * const unsubscribe = onMessage(router);
 * ```
 */
export function createMessageRouter(config: RouteConfig): FeatureHandler {
    return (message: VSCodeMessage) => {
        // Determine which feature this message belongs to
        const messageType = message.type;
        const feature = MESSAGE_FEATURE_MAP[messageType];

        // Call global handlers first
        if (config.global) {
            config.global.forEach((handler) => {
                try {
                    handler(message);
                } catch (error) {
                    console.error('[MessageRouter] Error in global handler:', error);
                }
            });
        }

        // Call feature-specific handlers
        if (feature && config[feature]) {
            const handlers = config[feature] as FeatureHandler[];
            handlers.forEach((handler) => {
                try {
                    handler(message);
                } catch (error) {
                    console.error(`[MessageRouter] Error in ${feature} handler:`, error);
                }
            });
        }
    };
}

/**
 * Type guard for message type
 */
export function isMessageType<T extends VSCodeMessage['type']>(
    message: VSCodeMessage,
    type: T
): message is Extract<VSCodeMessage, { type: T }> {
    return message.type === type;
}

/**
 * Get feature for message type
 */
export function getFeatureForMessageType(type: string): keyof RouteConfig | undefined {
    return MESSAGE_FEATURE_MAP[type];
}

export default createMessageRouter;
