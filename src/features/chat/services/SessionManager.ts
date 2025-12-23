/**
 * SessionManager handles session lifecycle management
 * 
 * Feature: chat-enhancements
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 6.1, 6.4, 6.5
 */

import {
    ChatSession,
    ISessionManager,
    IChatHistoryService,
} from './ChatHistoryTypes';

export class SessionManager implements ISessionManager {
    private currentSession: ChatSession | null = null;
    private incognitoMode: boolean = false;
    private sessionStates: Map<string, any> = new Map();

    constructor(private readonly chatHistoryService: IChatHistoryService) { }

    /**
     * Get the current active session
     */
    getCurrentSession(): ChatSession | null {
        return this.currentSession;
    }

    /**
     * Create a new session
     * Validates: Requirements 7.1, 7.2, 7.3, 7.4
     */
    async createNewSession(isIncognito: boolean): Promise<ChatSession> {
        // Close current session if exists
        if (this.currentSession) {
            await this.closeCurrentSession();
        }

        // Create new session
        const session = await this.chatHistoryService.createSession(isIncognito);
        this.currentSession = session;
        this.incognitoMode = isIncognito;

        // Initialize empty state for new session
        this.sessionStates.set(session.sessionId, {
            messages: [],
            createdAt: Date.now(),
        });

        console.log('[SessionManager] Created new session:', {
            sessionId: session.sessionId,
            isIncognito,
        });

        return session;
    }

    /**
     * Switch to a different session
     * Deactivates incognito mode when switching
     * Validates: Requirements 7.5, 6.5
     */
    async switchSession(sessionId: string): Promise<ChatSession> {
        // Deactivate incognito mode when switching sessions
        if (this.incognitoMode) {
            console.log('[SessionManager] Deactivating incognito mode on session switch');
            this.incognitoMode = false;
        }

        // Get session from history
        const sessions = await this.chatHistoryService.getSessionHistory({ limit: 1000 });
        const session = sessions.find(s => s.sessionId === sessionId);

        if (!session) {
            throw new Error(`Session not found: ${sessionId}`);
        }

        // Save current session state if exists
        if (this.currentSession) {
            // State is already preserved in sessionStates map via updateSessionState
        }

        this.currentSession = session;

        console.log('[SessionManager] Switched to session:', sessionId);
        return session;
    }

    /**
     * Close the current session
     * Validates: Requirements 7.1, 2.4
     */
    async closeCurrentSession(): Promise<void> {
        if (!this.currentSession) {
            return;
        }

        const sessionId = this.currentSession.sessionId;

        // Close session in storage (calculates token summaries)
        if (!this.currentSession.isIncognito) {
            await this.chatHistoryService.closeSession(sessionId);
        }

        // Clean up state
        this.sessionStates.delete(sessionId);
        this.currentSession = null;

        console.log('[SessionManager] Closed session:', sessionId);
    }

    /**
     * Check if incognito mode is active
     * Validates: Requirements 6.1
     */
    isIncognitoActive(): boolean {
        return this.incognitoMode;
    }

    /**
     * Set incognito mode
     * Validates: Requirements 6.1, 6.4
     */
    setIncognitoMode(enabled: boolean): void {
        this.incognitoMode = enabled;
        console.log('[SessionManager] Incognito mode:', enabled ? 'enabled' : 'disabled');
    }

    /**
     * Get session state (for state independence)
     * Validates: Requirements 7.5
     */
    getSessionState(sessionId: string): any {
        return this.sessionStates.get(sessionId) || null;
    }

    /**
     * Update session state (for state independence)
     * Validates: Requirements 7.5
     */
    updateSessionState(sessionId: string, state: any): void {
        this.sessionStates.set(sessionId, state);
    }

    /**
     * Initialize session on IDE startup
     * Creates a new session if no active session exists
     * Validates: Requirements 7.1
     */
    async initializeOnStartup(): Promise<ChatSession> {
        if (this.currentSession) {
            return this.currentSession;
        }

        // Check for previous session in settings
        const lastSessionId = await this.chatHistoryService.getSetting('lastActiveSessionId');

        if (lastSessionId) {
            try {
                // Try to restore previous session
                return await this.switchSession(lastSessionId);
            } catch {
                // Session doesn't exist, create new one
                console.log('[SessionManager] Previous session not found, creating new');
            }
        }

        // Create new session
        return this.createNewSession(false);
    }

    /**
     * Handle IDE shutdown
     * Closes current session and saves state
     * Validates: Requirements 7.1, 2.4
     */
    async handleShutdown(): Promise<void> {
        if (this.currentSession) {
            // Save last active session ID for restore on next startup
            await this.chatHistoryService.setSetting(
                'lastActiveSessionId',
                this.currentSession.sessionId
            );

            await this.closeCurrentSession();
        }

        console.log('[SessionManager] Shutdown complete');
    }

    /**
     * Get session count
     */
    async getSessionCount(): Promise<number> {
        const sessions = await this.chatHistoryService.getSessionHistory();
        return sessions.length;
    }
}
