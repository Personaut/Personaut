/**
 * ChatSettingsService manages user chat preferences
 * 
 * Feature: chat-enhancements
 * Validates: Requirements 5.1, 9.1, 9.4
 */

import {
    ChatSettings,
    DEFAULT_CHAT_SETTINGS,
    IChatHistoryService,
} from './ChatHistoryTypes';

export class ChatSettingsService {
    private settings: ChatSettings = { ...DEFAULT_CHAT_SETTINGS };
    private initialized: boolean = false;

    constructor(private readonly chatHistoryService: IChatHistoryService) { }

    /**
     * Initialize settings from storage
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;

        try {
            // Load each setting from storage
            const trackHistory = await this.chatHistoryService.getSetting('trackHistory');
            const userMessageColor = await this.chatHistoryService.getSetting('userMessageColor');
            const agentMessageColor = await this.chatHistoryService.getSetting('agentMessageColor');
            const selectedPersonaId = await this.chatHistoryService.getSetting('selectedPersonaId');
            const incognitoMode = await this.chatHistoryService.getSetting('incognitoMode');

            this.settings = {
                trackHistory: trackHistory !== 'false',
                userMessageColor: userMessageColor || DEFAULT_CHAT_SETTINGS.userMessageColor,
                agentMessageColor: agentMessageColor || DEFAULT_CHAT_SETTINGS.agentMessageColor,
                selectedPersonaId: selectedPersonaId || DEFAULT_CHAT_SETTINGS.selectedPersonaId,
                incognitoMode: incognitoMode === 'true',
            };

            this.initialized = true;
            console.log('[ChatSettingsService] Initialized with settings:', this.settings);
        } catch (error) {
            console.error('[ChatSettingsService] Failed to load settings, using defaults:', error);
            this.settings = { ...DEFAULT_CHAT_SETTINGS };
            this.initialized = true;
        }
    }

    /**
     * Get all settings
     * Validates: Requirements 5.1, 9.1
     */
    getSettings(): ChatSettings {
        return { ...this.settings };
    }

    /**
     * Update all settings
     * Validates: Requirements 5.1, 9.4
     */
    async updateSettings(newSettings: Partial<ChatSettings>): Promise<void> {
        this.settings = { ...this.settings, ...newSettings };

        // Persist each changed setting
        if (newSettings.trackHistory !== undefined) {
            await this.chatHistoryService.setSetting('trackHistory', String(newSettings.trackHistory));
        }
        if (newSettings.userMessageColor !== undefined) {
            await this.chatHistoryService.setSetting('userMessageColor', newSettings.userMessageColor);
        }
        if (newSettings.agentMessageColor !== undefined) {
            await this.chatHistoryService.setSetting('agentMessageColor', newSettings.agentMessageColor);
        }
        if (newSettings.selectedPersonaId !== undefined) {
            await this.chatHistoryService.setSetting('selectedPersonaId', newSettings.selectedPersonaId);
        }
        if (newSettings.incognitoMode !== undefined) {
            await this.chatHistoryService.setSetting('incognitoMode', String(newSettings.incognitoMode));
        }

        console.log('[ChatSettingsService] Settings updated:', newSettings);
    }

    /**
     * Get history tracking setting
     * Validates: Requirements 5.1
     */
    isHistoryTrackingEnabled(): boolean {
        return this.settings.trackHistory;
    }

    /**
     * Set history tracking
     * Validates: Requirements 5.1, 5.2, 5.5
     */
    async setHistoryTracking(enabled: boolean): Promise<void> {
        await this.updateSettings({ trackHistory: enabled });
    }

    /**
     * Get user message color
     * Validates: Requirements 9.1
     */
    getUserMessageColor(): string {
        return this.settings.userMessageColor;
    }

    /**
     * Set user message color
     * Validates: Requirements 9.1, 9.4
     */
    async setUserMessageColor(color: string): Promise<void> {
        // Validate color format (#RRGGBB or color name)
        if (!this.isValidColor(color)) {
            throw new Error('Invalid color format');
        }
        await this.updateSettings({ userMessageColor: color });
    }

    /**
     * Get agent message color
     * Validates: Requirements 9.1
     */
    getAgentMessageColor(): string {
        return this.settings.agentMessageColor;
    }

    /**
     * Set agent message color
     * Validates: Requirements 9.1, 9.4
     */
    async setAgentMessageColor(color: string): Promise<void> {
        // Validate color format (#RRGGBB or color name)
        if (!this.isValidColor(color)) {
            throw new Error('Invalid color format');
        }
        await this.updateSettings({ agentMessageColor: color });
    }

    /**
     * Get selected persona ID
     * Validates: Requirements 1.2
     */
    getSelectedPersonaId(): string {
        return this.settings.selectedPersonaId;
    }

    /**
     * Set selected persona
     * Validates: Requirements 1.2
     */
    async setSelectedPersonaId(personaId: string): Promise<void> {
        await this.updateSettings({ selectedPersonaId: personaId });
    }

    /**
     * Get incognito mode setting
     * Validates: Requirements 6.1
     */
    isIncognitoMode(): boolean {
        return this.settings.incognitoMode;
    }

    /**
     * Set incognito mode
     * Validates: Requirements 6.1
     */
    async setIncognitoMode(enabled: boolean): Promise<void> {
        await this.updateSettings({ incognitoMode: enabled });
    }

    /**
     * Reset settings to defaults
     */
    async resetToDefaults(): Promise<void> {
        await this.updateSettings(DEFAULT_CHAT_SETTINGS);
        console.log('[ChatSettingsService] Reset to defaults');
    }

    /**
     * Validate color format
     */
    private isValidColor(color: string): boolean {
        // Check for hex color format
        if (/^#[0-9A-Fa-f]{6}$/.test(color) || /^#[0-9A-Fa-f]{3}$/.test(color)) {
            return true;
        }

        // Check for rgba/rgb format
        if (/^rgba?\([\d,.\s]+\)$/.test(color)) {
            return true;
        }

        // Check for named colors (basic list)
        const namedColors = [
            'red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink',
            'cyan', 'magenta', 'white', 'black', 'gray', 'grey',
        ];
        if (namedColors.includes(color.toLowerCase())) {
            return true;
        }

        return false;
    }

    /**
     * Export settings for backup
     */
    exportSettings(): string {
        return JSON.stringify(this.settings, null, 2);
    }

    /**
     * Import settings from backup
     */
    async importSettings(jsonData: string): Promise<void> {
        try {
            const imported = JSON.parse(jsonData);
            await this.updateSettings(imported);
            console.log('[ChatSettingsService] Settings imported');
        } catch (error) {
            console.error('[ChatSettingsService] Failed to import settings:', error);
            throw error;
        }
    }
}
