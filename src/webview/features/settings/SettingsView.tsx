/**
 * SettingsView - Full Settings Management Interface
 *
 * Provides comprehensive settings management including:
 * - API provider configuration (Gemini, Bedrock)
 * - Theme settings
 * - Rate limits and permissions
 * - Artifact generation settings
 * - Data management
 *
 * Uses the shared theme system for consistent styling.
 *
 * **Validates: Requirements 6.4, 15.1-15.4**
 */
import React, { useState, useEffect, useCallback } from 'react';
import { colors, spacing, borderRadius, typography, shadows, transitions } from '../../shared/theme';
import { Button } from '../../shared/components/ui';

// Types
type ApiProvider = 'gemini' | 'bedrock';
type ThemeOption = 'dark' | 'match-ide' | 'personaut';
type OutputFormat = 'markdown' | 'json';
type SettingsSection = 'general' | 'provider' | 'chat' | 'artifacts' | 'data' | 'about';

export interface Settings {
  provider: ApiProvider;
  theme: ThemeOption;
  geminiApiKey: string;
  geminiModel: string;
  openaiApiKey: string;
  // AWS Bedrock
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
  // Artifacts
  artifacts: {
    generateBackstories: boolean;
    generateFeedback: boolean;
    saveToWorkspace: boolean;
    outputFormat: OutputFormat;
  };
  // Rate limits
  rateLimit: number;
  rateLimitWarningThreshold: number;
  // Permissions
  autoRead: boolean;
  autoWrite: boolean;
  autoExecute: boolean;
  // Chat settings
  userMessageColor: string;
  agentMessageColor: string;
}

const DEFAULT_SETTINGS: Settings = {
  provider: 'gemini',
  theme: 'match-ide',
  geminiApiKey: '',
  geminiModel: 'gemini-2.5-flash',
  openaiApiKey: '',
  awsAccessKey: '',
  awsSecretKey: '',
  awsRegion: 'us-east-1',
  awsSessionToken: '',
  bedrockModel: 'anthropic.claude-opus-4-5-20251101-v1:0',
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
  userMessageColor: '#3b82f6',
  agentMessageColor: '#10b981',
};

/**
 * SettingsView props
 */
export interface SettingsViewProps {
  /** Handler when settings change */
  onSettingsChanged?: (settings: Settings) => void;
  /** Handler to post messages to extension */
  postMessage?: (message: any) => void;
}

/**
 * API Key Input Component
 */
function ApiKeyInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    onChange(newValue);
  };

  const handleClear = () => {
    setLocalValue('');
    onChange('');
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: `${spacing.sm} ${spacing.md}`,
    paddingRight: '60px',
    backgroundColor: colors.background.tertiary,
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.lg,
    color: colors.text.primary,
    fontSize: typography.fontSize.sm,
  };

  const buttonContainerStyle: React.CSSProperties = {
    position: 'absolute',
    right: spacing.sm,
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'flex',
    gap: spacing.xs,
  };

  const iconButtonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: colors.text.muted,
    padding: spacing.xs,
    display: 'flex',
  };

  return (
    <div style={{ position: 'relative' }}>
      <input
        type={showPassword ? 'text' : 'password'}
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        style={inputStyle}
      />
      <div style={buttonContainerStyle}>
        {localValue && (
          <button style={iconButtonStyle} onClick={handleClear} title="Clear">
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
        <button
          style={iconButtonStyle}
          onClick={() => setShowPassword(!showPassword)}
          title={showPassword ? 'Hide' : 'Show'}
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            {showPassword ? (
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
            ) : (
              <>
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </>
            )}
          </svg>
        </button>
      </div>
    </div>
  );
}

/**
 * Toggle Switch Component
 */
function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}) {
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: `${spacing.sm} 0`,
  };

  const toggleStyle: React.CSSProperties = {
    width: 44,
    height: 24,
    backgroundColor: checked ? colors.accent : colors.background.tertiary,
    borderRadius: 12,
    cursor: 'pointer',
    position: 'relative',
    transition: transitions.fast,
    border: `1px solid ${colors.border}`,
  };

  const knobStyle: React.CSSProperties = {
    width: 20,
    height: 20,
    backgroundColor: colors.text.primary,
    borderRadius: '50%',
    position: 'absolute',
    top: 1,
    left: checked ? 21 : 1,
    transition: transitions.fast,
  };

  return (
    <div style={containerStyle}>
      <div>
        <div style={{ fontSize: typography.fontSize.sm, color: colors.text.primary }}>{label}</div>
        {description && (
          <div style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: spacing.xs }}>
            {description}
          </div>
        )}
      </div>
      <div style={toggleStyle} onClick={() => onChange(!checked)}>
        <div style={knobStyle} />
      </div>
    </div>
  );
}

/**
 * Section Header Component
 */
function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div style={{ marginBottom: spacing.md }}>
      <h3 style={{
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.semibold,
        color: colors.text.primary,
        marginBottom: spacing.xs,
      }}>
        {title}
      </h3>
      {description && (
        <p style={{ fontSize: typography.fontSize.sm, color: colors.text.muted }}>{description}</p>
      )}
    </div>
  );
}

/**
 * Main SettingsView Component
 */
export function SettingsView({ onSettingsChanged, postMessage }: SettingsViewProps) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Handle messages from extension
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      switch (message.type) {
        case 'settings-loaded':
          setSettings({ ...DEFAULT_SETTINGS, ...message.settings });
          break;
        case 'settings-saved':
          setSaveStatus('saved');
          showToastMessage('Settings saved successfully!');
          setTimeout(() => setSaveStatus('idle'), 2500);
          break;
        case 'data-reset-complete':
          showToastMessage('All data has been reset!');
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    postMessage?.({ type: 'get-settings' });

    return () => window.removeEventListener('message', handleMessage);
  }, [postMessage]);

  const showToastMessage = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  };

  const handleSave = useCallback(() => {
    setSaveStatus('saving');
    postMessage?.({ type: 'save-settings', settings });
    onSettingsChanged?.(settings);
  }, [settings, postMessage, onSettingsChanged]);

  const updateSetting = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateArtifactSetting = useCallback(<K extends keyof Settings['artifacts']>(
    key: K,
    value: Settings['artifacts'][K]
  ) => {
    setSettings(prev => ({
      ...prev,
      artifacts: { ...prev.artifacts, [key]: value },
    }));
  }, []);

  // Styles
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    height: '100%',
    backgroundColor: colors.background.primary,
  };

  const sidebarStyle: React.CSSProperties = {
    width: 200,
    borderRight: `1px solid ${colors.border}`,
    padding: spacing.md,
    display: 'flex',
    flexDirection: 'column',
    gap: spacing.xs,
  };

  const navItemStyle = (isActive: boolean): React.CSSProperties => ({
    padding: `${spacing.sm} ${spacing.md}`,
    borderRadius: borderRadius.md,
    backgroundColor: isActive ? colors.background.tertiary : 'transparent',
    color: isActive ? colors.text.primary : colors.text.secondary,
    cursor: 'pointer',
    fontSize: typography.fontSize.sm,
    fontWeight: isActive ? typography.fontWeight.medium : typography.fontWeight.normal,
    transition: transitions.fast,
    display: 'flex',
    alignItems: 'center',
    gap: spacing.sm,
  });

  const contentStyle: React.CSSProperties = {
    flex: 1,
    overflow: 'auto',
    padding: spacing.lg,
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    border: `1px solid ${colors.border}`,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  };

  const toastStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: 20,
    right: 20,
    backgroundColor: colors.success,
    color: 'white',
    padding: `${spacing.sm} ${spacing.lg}`,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.lg,
    zIndex: 1000,
    opacity: showToast ? 1 : 0,
    transform: showToast ? 'translateY(0)' : 'translateY(20px)',
    transition: transitions.normal,
  };

  // Flat SVG icons for each section
  const sectionIcons: Record<SettingsSection, JSX.Element> = {
    general: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
    provider: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
    chat: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    artifacts: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
    data: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      </svg>
    ),
    about: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
      </svg>
    ),
  };

  const sections: { id: SettingsSection; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'provider', label: 'AI Provider' },
    { id: 'chat', label: 'Chat' },
    { id: 'artifacts', label: 'Artifacts' },
    { id: 'data', label: 'Data' },
    { id: 'about', label: 'About' },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'general':
        return (
          <>
            <div style={cardStyle}>
              <SectionHeader title="Tool Permissions" description="Control which tools the AI can use automatically" />
              <Toggle
                checked={settings.autoRead}
                onChange={v => updateSetting('autoRead', v)}
                label="Auto Read"
                description="Allow read_file and list_files tools to run automatically"
              />
              <Toggle
                checked={settings.autoWrite}
                onChange={v => updateSetting('autoWrite', v)}
                label="Auto Write"
                description="Allow write_file tool to create and modify files automatically"
              />
              <Toggle
                checked={settings.autoExecute}
                onChange={v => updateSetting('autoExecute', v)}
                label="Auto Execute"
                description="Allow execute_command tool to run terminal commands automatically"
              />
              <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: spacing.md }}>
                Note: browser_action tool is always allowed for web interactions.
              </p>
            </div>

            <div style={cardStyle}>
              <SectionHeader title="Rate Limits" description="Monitor token usage" />
              <div style={{ marginBottom: spacing.md }}>
                <label style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, display: 'block', marginBottom: spacing.xs }}>
                  Token Limit
                </label>
                <input
                  type="number"
                  value={settings.rateLimit}
                  onChange={e => updateSetting('rateLimit', parseInt(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: `${spacing.sm} ${spacing.md}`,
                    backgroundColor: colors.background.tertiary,
                    border: `1px solid ${colors.border}`,
                    borderRadius: borderRadius.lg,
                    color: colors.text.primary,
                    fontSize: typography.fontSize.sm,
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, display: 'block', marginBottom: spacing.xs }}>
                  Warning Threshold (%)
                </label>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={settings.rateLimitWarningThreshold}
                  onChange={e => updateSetting('rateLimitWarningThreshold', parseInt(e.target.value) || 80)}
                  style={{
                    width: '100%',
                    padding: `${spacing.sm} ${spacing.md}`,
                    backgroundColor: colors.background.tertiary,
                    border: `1px solid ${colors.border}`,
                    borderRadius: borderRadius.lg,
                    color: colors.text.primary,
                    fontSize: typography.fontSize.sm,
                  }}
                />
              </div>
            </div>
          </>
        );

      case 'provider':
        return (
          <>
            {/* Provider Selection Dropdown */}
            <div style={cardStyle}>
              <SectionHeader title="API Provider" description="Select and configure your AI provider" />
              <select
                value={settings.provider}
                onChange={e => updateSetting('provider', e.target.value as ApiProvider)}
                style={{
                  width: '100%',
                  padding: `${spacing.md} ${spacing.lg}`,
                  backgroundColor: colors.background.tertiary,
                  border: `1px solid ${colors.border}`,
                  borderRadius: borderRadius.lg,
                  color: colors.text.primary,
                  fontSize: typography.fontSize.md,
                  fontWeight: typography.fontWeight.medium,
                  cursor: 'pointer',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 16px center',
                }}
              >
                <option value="gemini">Google Gemini</option>
                <option value="bedrock">AWS Bedrock</option>
              </select>
            </div>

            {/* Gemini Configuration */}
            {settings.provider === 'gemini' && (
              <div style={cardStyle}>
                <SectionHeader title="Gemini Configuration" />

                <div style={{ marginBottom: spacing.lg }}>
                  <label style={{
                    fontSize: typography.fontSize.sm,
                    color: colors.text.secondary,
                    display: 'block',
                    marginBottom: spacing.sm,
                    fontWeight: typography.fontWeight.medium,
                  }}>
                    API Key
                  </label>
                  <ApiKeyInput
                    value={settings.geminiApiKey}
                    onChange={v => updateSetting('geminiApiKey', v)}
                    placeholder="Enter your Gemini API key"
                  />
                  <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: spacing.xs }}>
                    Get your API key from <a href="https://aistudio.google.com/apikey" style={{ color: colors.accent }}>Google AI Studio</a>
                  </p>
                </div>

                <div>
                  <label style={{
                    fontSize: typography.fontSize.sm,
                    color: colors.text.secondary,
                    display: 'block',
                    marginBottom: spacing.sm,
                    fontWeight: typography.fontWeight.medium,
                  }}>
                    Model
                  </label>
                  <select
                    value={settings.geminiModel}
                    onChange={e => updateSetting('geminiModel', e.target.value)}
                    style={{
                      width: '100%',
                      padding: `${spacing.sm} ${spacing.md}`,
                      backgroundColor: colors.background.tertiary,
                      border: `1px solid ${colors.border}`,
                      borderRadius: borderRadius.lg,
                      color: colors.text.primary,
                      fontSize: typography.fontSize.sm,
                    }}
                  >
                    <optgroup label="Gemini 3 (Preview)">
                      <option value="gemini-3-pro">Gemini 3 Pro (Latest Reasoning)</option>
                      <option value="gemini-3-flash">Gemini 3 Flash (Best Multimodal)</option>
                      <option value="gemini-3-pro-image">Gemini 3 Pro Image (Image Generation)</option>
                    </optgroup>
                    <optgroup label="Gemini 2.5 (Generally Available)">
                      <option value="gemini-2.5-pro">Gemini 2.5 Pro (Complex Reasoning)</option>
                      <option value="gemini-2.5-flash">Gemini 2.5 Flash (Fast & Capable)</option>
                      <option value="gemini-2.5-flash-image">Gemini 2.5 Flash Image (Creative)</option>
                      <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash-Lite (High Throughput)</option>
                    </optgroup>
                    <optgroup label="Gemini 2.0">
                      <option value="gemini-2.0-flash">Gemini 2.0 Flash (Cost-Effective)</option>
                      <option value="gemini-2.0-flash-lite">Gemini 2.0 Flash-Lite (Ultra-Efficient)</option>
                    </optgroup>
                    <optgroup label="Gemini 1.5">
                      <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                      <option value="gemini-1.5-flash-8b">Gemini 1.5 Flash-8B</option>
                      <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                    </optgroup>
                    <optgroup label="Gemini 1.0 (Legacy)">
                      <option value="gemini-1.0-pro">Gemini 1.0 Pro</option>
                    </optgroup>
                  </select>
                </div>
              </div>
            )}

            {/* Bedrock Configuration */}
            {settings.provider === 'bedrock' && (
              <div style={cardStyle}>
                <SectionHeader title="AWS Bedrock Configuration" />

                {/* Authentication Method */}
                <div style={{ marginBottom: spacing.lg }}>
                  <label style={{
                    fontSize: typography.fontSize.sm,
                    color: colors.text.secondary,
                    display: 'block',
                    marginBottom: spacing.sm,
                    fontWeight: typography.fontWeight.medium,
                  }}>
                    Authentication
                  </label>
                  <div style={{ display: 'flex', gap: spacing.sm, marginBottom: spacing.md }}>
                    <button
                      onClick={() => updateSetting('awsUseProfile', false)}
                      style={{
                        flex: 1,
                        padding: spacing.sm,
                        backgroundColor: !settings.awsUseProfile ? colors.accent : colors.background.tertiary,
                        border: `1px solid ${!settings.awsUseProfile ? colors.accent : colors.border}`,
                        borderRadius: borderRadius.md,
                        color: !settings.awsUseProfile ? '#1e1e1e' : colors.text.secondary,
                        fontSize: typography.fontSize.xs,
                        fontWeight: typography.fontWeight.medium,
                        cursor: 'pointer',
                      }}
                    >
                      Access Keys
                    </button>
                    <button
                      onClick={() => updateSetting('awsUseProfile', true)}
                      style={{
                        flex: 1,
                        padding: spacing.sm,
                        backgroundColor: settings.awsUseProfile ? colors.accent : colors.background.tertiary,
                        border: `1px solid ${settings.awsUseProfile ? colors.accent : colors.border}`,
                        borderRadius: borderRadius.md,
                        color: settings.awsUseProfile ? '#1e1e1e' : colors.text.secondary,
                        fontSize: typography.fontSize.xs,
                        fontWeight: typography.fontWeight.medium,
                        cursor: 'pointer',
                      }}
                    >
                      AWS Profile
                    </button>
                  </div>
                </div>

                {settings.awsUseProfile ? (
                  <div style={{ marginBottom: spacing.lg }}>
                    <label style={{
                      fontSize: typography.fontSize.sm,
                      color: colors.text.secondary,
                      display: 'block',
                      marginBottom: spacing.sm,
                      fontWeight: typography.fontWeight.medium,
                    }}>
                      Profile Name
                    </label>
                    <input
                      type="text"
                      value={settings.awsProfile}
                      onChange={e => updateSetting('awsProfile', e.target.value)}
                      placeholder="default"
                      style={{
                        width: '100%',
                        padding: `${spacing.sm} ${spacing.md}`,
                        backgroundColor: colors.background.tertiary,
                        border: `1px solid ${colors.border}`,
                        borderRadius: borderRadius.lg,
                        color: colors.text.primary,
                        fontSize: typography.fontSize.sm,
                      }}
                    />
                    <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted, marginTop: spacing.xs }}>
                      Uses credentials from ~/.aws/credentials
                    </p>
                  </div>
                ) : (
                  <>
                    <div style={{ marginBottom: spacing.md }}>
                      <label style={{
                        fontSize: typography.fontSize.sm,
                        color: colors.text.secondary,
                        display: 'block',
                        marginBottom: spacing.sm,
                        fontWeight: typography.fontWeight.medium,
                      }}>
                        Access Key ID
                      </label>
                      <ApiKeyInput
                        value={settings.awsAccessKey}
                        onChange={v => updateSetting('awsAccessKey', v)}
                        placeholder="AKIAIOSFODNN7EXAMPLE"
                      />
                    </div>
                    <div style={{ marginBottom: spacing.lg }}>
                      <label style={{
                        fontSize: typography.fontSize.sm,
                        color: colors.text.secondary,
                        display: 'block',
                        marginBottom: spacing.sm,
                        fontWeight: typography.fontWeight.medium,
                      }}>
                        Secret Access Key
                      </label>
                      <ApiKeyInput
                        value={settings.awsSecretKey}
                        onChange={v => updateSetting('awsSecretKey', v)}
                        placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                      />
                    </div>
                  </>
                )}

                {/* Region */}
                <div style={{ marginBottom: spacing.lg }}>
                  <label style={{
                    fontSize: typography.fontSize.sm,
                    color: colors.text.secondary,
                    display: 'block',
                    marginBottom: spacing.sm,
                    fontWeight: typography.fontWeight.medium,
                  }}>
                    Region
                  </label>
                  <select
                    value={settings.awsRegion}
                    onChange={e => updateSetting('awsRegion', e.target.value)}
                    style={{
                      width: '100%',
                      padding: `${spacing.sm} ${spacing.md}`,
                      backgroundColor: colors.background.tertiary,
                      border: `1px solid ${colors.border}`,
                      borderRadius: borderRadius.lg,
                      color: colors.text.primary,
                      fontSize: typography.fontSize.sm,
                    }}
                  >
                    <option value="us-east-1">US East (N. Virginia)</option>
                    <option value="us-west-2">US West (Oregon)</option>
                    <option value="eu-west-1">Europe (Ireland)</option>
                    <option value="eu-central-1">Europe (Frankfurt)</option>
                    <option value="ap-northeast-1">Asia Pacific (Tokyo)</option>
                    <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                  </select>
                </div>

                {/* Model */}
                <div>
                  <label style={{
                    fontSize: typography.fontSize.sm,
                    color: colors.text.secondary,
                    display: 'block',
                    marginBottom: spacing.sm,
                    fontWeight: typography.fontWeight.medium,
                  }}>
                    Model
                  </label>
                  <select
                    value={settings.bedrockModel}
                    onChange={e => updateSetting('bedrockModel', e.target.value)}
                    style={{
                      width: '100%',
                      padding: `${spacing.sm} ${spacing.md}`,
                      backgroundColor: colors.background.tertiary,
                      border: `1px solid ${colors.border}`,
                      borderRadius: borderRadius.lg,
                      color: colors.text.primary,
                      fontSize: typography.fontSize.sm,
                    }}
                  >
                    <optgroup label="Anthropic">
                      <option value="anthropic.claude-opus-4-5-20251101-v1:0">Claude Opus 4.5 (Latest)</option>
                      <option value="anthropic.claude-sonnet-4-5-20250929-v1:0">Claude Sonnet 4.5</option>
                      <option value="anthropic.claude-haiku-4-5-20251001-v1:0">Claude Haiku 4.5</option>
                      <option value="anthropic.claude-3-5-haiku-20241022-v1:0">Claude 3.5 Haiku</option>
                    </optgroup>
                    <optgroup label="Amazon">
                      <option value="amazon.nova-premier-v1:0">Nova Premier (Most Capable)</option>
                      <option value="amazon.nova-2-sonic-v1:0">Nova 2 Sonic (Latest)</option>
                      <option value="amazon.nova-2-lite-v1:0">Nova 2 Lite</option>
                      <option value="amazon.nova-pro-v1:0">Nova Pro</option>
                    </optgroup>
                    <optgroup label="Meta">
                      <option value="meta.llama4-maverick-17b-instruct-v1:0">Llama 4 Maverick 17B (Latest)</option>
                      <option value="meta.llama4-scout-17b-instruct-v1:0">Llama 4 Scout 17B</option>
                      <option value="meta.llama3-3-70b-instruct-v1:0">Llama 3.3 70B</option>
                      <option value="meta.llama3-2-90b-instruct-v1:0">Llama 3.2 90B (Multimodal)</option>
                    </optgroup>
                    <optgroup label="Mistral AI">
                      <option value="mistral.mistral-large-3-675b-instruct">Mistral Large 3 675B (Latest)</option>
                      <option value="mistral.pixtral-large-2502-v1:0">Pixtral Large (Multimodal)</option>
                      <option value="mistral.ministral-3-14b-instruct">Ministral 3 14B</option>
                      <option value="mistral.magistral-small-2509">Magistral Small</option>
                    </optgroup>
                    <optgroup label="Cohere">
                      <option value="cohere.command-r-plus-v1:0">Command R+</option>
                      <option value="cohere.command-r-v1:0">Command R</option>
                    </optgroup>
                    <optgroup label="AI21 Labs">
                      <option value="ai21.jamba-1-5-large-v1:0">Jamba 1.5 Large</option>
                      <option value="ai21.jamba-1-5-mini-v1:0">Jamba 1.5 Mini</option>
                    </optgroup>
                  </select>
                </div>
              </div>
            )}
          </>
        );

      case 'chat':
        return (
          <>
            <div style={cardStyle}>
              <SectionHeader title="Chat History" description="Your conversations are automatically saved" />
              <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary }}>
                Chat history is automatically saved to your workspace storage. You can access previous conversations
                from the History panel in the chat view.
              </p>
            </div>

            <div style={cardStyle}>
              <SectionHeader title="Message Colors" description="Customize message bubble colors" />
              <div style={{ display: 'flex', gap: spacing.lg, marginTop: spacing.md }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, display: 'block', marginBottom: spacing.xs }}>
                    Your Messages
                  </label>
                  <input
                    type="color"
                    value={settings.userMessageColor}
                    onChange={(e) => updateSetting('userMessageColor', e.target.value)}
                    style={{
                      width: '100%',
                      height: 40,
                      border: `1px solid ${colors.border}`,
                      borderRadius: borderRadius.md,
                      cursor: 'pointer',
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, display: 'block', marginBottom: spacing.xs }}>
                    Agent Messages
                  </label>
                  <input
                    type="color"
                    value={settings.agentMessageColor}
                    onChange={(e) => updateSetting('agentMessageColor', e.target.value)}
                    style={{
                      width: '100%',
                      height: 40,
                      border: `1px solid ${colors.border}`,
                      borderRadius: borderRadius.md,
                      cursor: 'pointer',
                    }}
                  />
                </div>
              </div>
            </div>

            <div style={cardStyle}>
              <SectionHeader title="Default Persona" description="Choose which agent responds to your messages" />
              <select
                defaultValue="pippet"
                style={{
                  width: '100%',
                  padding: `${spacing.sm} ${spacing.md}`,
                  backgroundColor: colors.background.tertiary,
                  border: `1px solid ${colors.border}`,
                  borderRadius: borderRadius.lg,
                  color: colors.text.primary,
                  fontSize: typography.fontSize.sm,
                }}
              >
                <option value="pippet">🐾 Pippet (Default)</option>
                <option value="ux-designer">🎨 UX Designer</option>
                <option value="developer">💻 Developer</option>
              </select>
            </div>
          </>
        );

      case 'artifacts':
        return (
          <div style={cardStyle}>
            <SectionHeader title="Artifact Generation" description="Configure how artifacts are generated" />
            <Toggle
              checked={settings.artifacts.generateBackstories}
              onChange={v => updateArtifactSetting('generateBackstories', v)}
              label="Generate Backstories"
              description="Create detailed backstories for personas"
            />
            <Toggle
              checked={settings.artifacts.generateFeedback}
              onChange={v => updateArtifactSetting('generateFeedback', v)}
              label="Generate Feedback"
              description="Generate feedback from personas"
            />
            <Toggle
              checked={settings.artifacts.saveToWorkspace}
              onChange={v => updateArtifactSetting('saveToWorkspace', v)}
              label="Save to Workspace"
              description="Save artifacts to workspace folder"
            />
            <div style={{ marginTop: spacing.md }}>
              <label style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, display: 'block', marginBottom: spacing.xs }}>
                Output Format
              </label>
              <select
                value={settings.artifacts.outputFormat}
                onChange={e => updateArtifactSetting('outputFormat', e.target.value as OutputFormat)}
                style={{
                  width: '100%',
                  padding: `${spacing.sm} ${spacing.md}`,
                  backgroundColor: colors.background.tertiary,
                  border: `1px solid ${colors.border}`,
                  borderRadius: borderRadius.lg,
                  color: colors.text.primary,
                  fontSize: typography.fontSize.sm,
                }}
              >
                <option value="markdown">Markdown</option>
                <option value="json">JSON</option>
              </select>
            </div>
          </div>
        );

      case 'data':
        return (
          <div style={cardStyle}>
            <SectionHeader title="Data Management" description="Manage your stored data" />
            <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.lg }}>
              Clear all stored data including conversation history, personas, and settings.
              This action cannot be undone.
            </p>
            {showClearConfirm ? (
              <div style={{ display: 'flex', gap: spacing.md }}>
                <Button variant="danger" onClick={() => {
                  postMessage?.({ type: 'reset-data' });
                  setShowClearConfirm(false);
                }}>
                  Confirm Reset
                </Button>
                <Button variant="secondary" onClick={() => setShowClearConfirm(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button variant="danger" onClick={() => setShowClearConfirm(true)}>
                Clear All Data
              </Button>
            )}
          </div>
        );

      case 'about':
        return (
          <div style={cardStyle}>
            <SectionHeader title="About Personaut" />
            <p style={{ fontSize: typography.fontSize.sm, color: colors.text.secondary, marginBottom: spacing.md }}>
              Personaut is an AI-powered development assistant that helps you build applications
              by understanding your users through persona-driven design.
            </p>
            <p style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>
              Version 0.1.4
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={containerStyle}>
      {/* Sidebar Navigation */}
      <div style={sidebarStyle}>
        {sections.map(section => (
          <div
            key={section.id}
            style={navItemStyle(activeSection === section.id)}
            onClick={() => setActiveSection(section.id)}
          >
            <span style={{ opacity: activeSection === section.id ? 1 : 0.6 }}>{sectionIcons[section.id]}</span>
            <span>{section.label}</span>
          </div>
        ))}

        <div style={{ flex: 1 }} />

        {/* Save Button */}
        <Button
          variant="primary"
          onClick={handleSave}
          loading={saveStatus === 'saving'}
          fullWidth
        >
          {saveStatus === 'saved' ? '✓ Saved' : 'Save Settings'}
        </Button>
      </div>

      {/* Content Area */}
      <div style={contentStyle}>
        {renderContent()}
      </div>

      {/* Toast */}
      <div style={toastStyle}>{toastMessage}</div>
    </div>
  );
}

export default SettingsView;
