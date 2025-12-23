import { useState, useEffect, useCallback } from 'react';
import { useVSCode } from '../../../shared/hooks/useVSCode';
import { Settings, SaveStatus, DEFAULT_SETTINGS, ArtifactSettings } from '../types';

/**
 * Return type for useSettings hook
 */
export interface UseSettingsReturn {
    /** Current settings */
    settings: Settings;
    /** Update a single setting */
    updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
    /** Update an artifact setting */
    updateArtifactSetting: <K extends keyof ArtifactSettings>(key: K, value: ArtifactSettings[K]) => void;
    /** Save settings to extension */
    saveSettings: () => void;
    /** Current save status */
    saveStatus: SaveStatus;
    /** Whether settings are loading */
    isLoading: boolean;
}

/**
 * Hook for managing settings state.
 *
 * Handles loading, saving, and updating settings with VS Code extension.
 *
 * @example
 * ```tsx
 * function SettingsForm() {
 *   const { settings, updateSetting, saveSettings, saveStatus } = useSettings();
 *
 *   return (
 *     <div>
 *       <Input
 *         value={settings.geminiApiKey}
 *         onChange={(e) => updateSetting('geminiApiKey', e.target.value)}
 *       />
 *       <Button onClick={saveSettings} loading={saveStatus === 'saving'}>
 *         Save
 *       </Button>
 *     </div>
 *   );
 * }
 * ```
 *
 * **Validates: Requirements 4.4, 25.4**
 */
export function useSettings(onSettingsChanged?: (settings: Settings) => void): UseSettingsReturn {
    const { postMessage, onMessage } = useVSCode();
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
    const [isLoading, setIsLoading] = useState(true);

    // Request settings on mount
    useEffect(() => {
        postMessage({ type: 'get-settings' });
    }, [postMessage]);

    // Handle messages from extension
    useEffect(() => {
        const unsubscribe = onMessage((message) => {
            if (message.type === 'settings-loaded') {
                const loadedSettings = { ...DEFAULT_SETTINGS, ...(message as any).settings };
                setSettings(loadedSettings);
                setIsLoading(false);
                onSettingsChanged?.(loadedSettings);
            } else if (message.type === 'settings-saved') {
                setSaveStatus('saved');
                setTimeout(() => setSaveStatus('idle'), 2500);
            } else if (message.type === 'settings-error') {
                setSaveStatus('error');
                console.error('Settings save error:', (message as any).error);
                setTimeout(() => setSaveStatus('idle'), 3000);
            }
        });

        return unsubscribe;
    }, [onMessage, onSettingsChanged]);

    const updateSetting = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
        setSettings((prev) => ({ ...prev, [key]: value }));
    }, []);

    const updateArtifactSetting = useCallback(
        <K extends keyof ArtifactSettings>(key: K, value: ArtifactSettings[K]) => {
            setSettings((prev) => ({
                ...prev,
                artifacts: { ...prev.artifacts, [key]: value },
            }));
        },
        []
    );

    const saveSettings = useCallback(() => {
        setSaveStatus('saving');
        postMessage({ type: 'save-settings', settings });
        onSettingsChanged?.(settings);
    }, [postMessage, settings, onSettingsChanged]);

    return {
        settings,
        updateSetting,
        updateArtifactSetting,
        saveSettings,
        saveStatus,
        isLoading,
    };
}

export default useSettings;
