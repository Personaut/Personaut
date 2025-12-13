import React, { useState, useEffect } from 'react';

interface SettingsTabProps {
  vscode: any;
  onSettingsChanged?: (settings: Settings) => void;
}

type ApiProvider = 'gemini' | 'bedrock';

interface Settings {
  provider: ApiProvider;
  theme: 'dark' | 'match-ide' | 'personaut';
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
  artifacts: {
    generateBackstories: boolean;
    generateFeedback: boolean;
    saveToWorkspace: boolean;
    outputFormat: 'markdown' | 'json';
  };
  rateLimit: number; // Token limit
  rateLimitWarningThreshold: number; // Percentage (1-99)
  autoRead: boolean;
  autoWrite: boolean;
  autoExecute: boolean;
}

// Reusable API Key Input Component
interface ApiKeyInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}

const ApiKeyInput: React.FC<ApiKeyInputProps> = ({ value, onChange, placeholder, className = '' }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Sync local value when prop changes
  React.useEffect(() => {
    if (!isEditing) {
      setLocalValue(value);
    }
  }, [value, isEditing]);

  const handleFocus = () => {
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    onChange(localValue);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
  };

  const handleClear = () => {
    setLocalValue('');
    onChange('');
    setIsEditing(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    }
    if (e.key === 'Escape') {
      setLocalValue(value);
      setIsEditing(false);
      inputRef.current?.blur();
    }
  };

  const hasValue = localValue.length > 0;
  const displayValue = isEditing ? localValue : value;

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type={showPassword ? 'text' : 'password'}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`w-full bg-tertiary border border-border rounded-lg px-4 py-3 text-sm text-primary placeholder-muted focus:outline-none focus:border-accent pr-20 ${className}`}
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {hasValue && (
          <button
            type="button"
            onClick={handleClear}
            className="text-muted hover:text-red-500 transition-colors p-1"
            title="Clear API key"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="text-muted hover:text-accent transition-colors p-1"
          title={showPassword ? 'Hide API key' : 'Show API key'}
        >
          {showPassword ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};

const defaultSettings: Settings = {
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
  rateLimit: 100000, // Default 100k tokens
  rateLimitWarningThreshold: 80, // Default 80%
  autoRead: false,
  autoWrite: false,
  autoExecute: false,
};

export const SettingsTab: React.FC<SettingsTabProps> = ({ vscode, onSettingsChanged }) => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [activeSection, setActiveSection] = useState<
    'general' | 'provider' | 'artifacts' | 'data' | 'about'
  >('general');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [_appName, setAppName] = useState<string>('');

  const [showClearDataConfirm, setShowClearDataConfirm] = useState(false);

  useEffect(() => {
    // Request current settings from extension
    vscode.postMessage({ type: 'get-settings' });
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === 'settings-loaded') {
        setSettings({ ...defaultSettings, ...message.settings });
        if (message.appName) {
          setAppName(message.appName);
        }
        // Notify parent of updates
        if (onSettingsChanged) {
          onSettingsChanged({ ...defaultSettings, ...message.settings });
        }
      } else if (message.type === 'settings-saved') {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else if (message.type === 'data-reset-complete') {
        setSaveStatus('saved');
        // The backend calls _handleGetSettings after reset, so we'll get 'settings-loaded' shortly after.
      } else if (message.type === 'settings-error') {
        setSaveStatus('idle'); // Reset status so user can try again
        // Ideally we should show the error, but for now we just unblock the button
        console.error('Settings save error:', message.error);
        // You might want to add an error state/toast here later
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleSave = () => {
    setSaveStatus('saving');
    vscode.postMessage({ type: 'save-settings', settings });
    // Optimistically update parent
    if (onSettingsChanged) {
      onSettingsChanged(settings);
    }
  };

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const updateArtifactSetting = <K extends keyof Settings['artifacts']>(
    key: K,
    value: Settings['artifacts'][K]
  ) => {
    setSettings((prev) => ({
      ...prev,
      artifacts: { ...prev.artifacts, [key]: value },
    }));
  };

  const sections = [
    {
      id: 'general' as const,
      label: 'General',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2-2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      ),
    },
    {
      id: 'provider' as const,
      label: 'API Provider',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
        </svg>
      ),
    },
    {
      id: 'artifacts' as const,
      label: 'Artifacts',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
        </svg>
      ),
    },
    {
      id: 'data' as const,
      label: 'Data',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
          <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
          <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
        </svg>
      ),
    },
    {
      id: 'about' as const,
      label: 'About',
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full bg-primary">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-secondary border-b border-border">
        <h2 className="text-xs font-bold text-muted uppercase tracking-widest">Settings</h2>
        {activeSection !== 'about' && (
          <button
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-accent text-accent-text rounded-md hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? '✓ Saved' : 'Save'}
          </button>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <div className="w-1/3 border-r border-border p-2">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg mb-1 text-sm transition-all flex items-center gap-2 ${activeSection === section.id
                ? 'bg-accent-dim text-accent border border-accent/30'
                : 'text-secondary hover:text-white hover:bg-tertiary'
                }`}
            >
              {section.icon}
              <span>{section.label}</span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeSection === 'general' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-primary mb-4">General Settings</h3>
                <p className="text-xs text-muted mb-6">General configuration for Personaut.</p>

                <div className="space-y-6">
                  <label className="block">
                    <span className="text-xs font-bold text-muted uppercase tracking-wider">
                      Rate Limit (Total Tokens)
                    </span>
                    <div className="mt-2 text-xs text-secondary mb-2">
                      Stop interactions if total token usage exceeds this limit. Enter 0 to disable.
                    </div>
                    <input
                      type="number"
                      value={settings.rateLimit}
                      onChange={(e) => updateSetting('rateLimit', parseInt(e.target.value) || 0)}
                      placeholder="100000"
                      className="w-full bg-tertiary border border-border rounded-lg px-4 py-3 text-sm text-primary placeholder-muted focus:outline-none focus:border-accent"
                    />
                  </label>

                  <label className="block">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-muted uppercase tracking-wider">
                        Usage Warning Threshold
                      </span>
                      <span className="text-xs font-mono text-accent">
                        {settings.rateLimitWarningThreshold}%
                      </span>
                    </div>
                    <div className="text-xs text-secondary mb-2">
                      Warn when token usage reaches this percentage of the limit.
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="99"
                      value={settings.rateLimitWarningThreshold}
                      onChange={(e) =>
                        updateSetting('rateLimitWarningThreshold', parseInt(e.target.value))
                      }
                      className="w-full accent-accent"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'provider' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-primary mb-4">API Provider</h3>
                <p className="text-xs text-muted mb-4">
                  Select the AI provider to power Personaut's persona generation and feedback.
                </p>

                {/* Provider Selection */}
                <div className="space-y-2 mb-6">
                  {[
                    {
                      id: 'gemini' as const,
                      name: 'Google Gemini',
                      desc: "Use Google's Gemini API",
                    },
                    {
                      id: 'bedrock' as const,
                      name: 'AWS Bedrock',
                      desc: 'Use AWS Bedrock (Claude)',
                    },
                  ].map((provider) => (
                    <label
                      key={provider.id}
                      className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all border ${settings.provider === provider.id
                        ? 'bg-accent-dim border-accent/30'
                        : 'bg-secondary border-border hover:border-border/80'
                        }`}
                    >
                      <input
                        type="radio"
                        name="provider"
                        value={provider.id}
                        checked={settings.provider === provider.id}
                        onChange={() => updateSetting('provider', provider.id)}
                        className="mt-1 accent-accent"
                      />
                      <div>
                        <div className="text-sm font-medium text-primary">{provider.name}</div>
                        <div className="text-xs text-secondary">{provider.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>



                {/* Gemini Config */}
                {settings.provider === 'gemini' && (
                  <div className="space-y-4">
                    <label className="block">
                      <span className="text-xs font-bold text-muted uppercase tracking-wider">
                        Model
                      </span>
                      <select
                        value={settings.geminiModel}
                        onChange={(e) => updateSetting('geminiModel', e.target.value)}
                        className="mt-2 w-full bg-tertiary border border-border rounded-lg px-4 py-3 text-sm text-primary focus:outline-none focus:border-accent"
                      >
                        <optgroup label="Gemini 3 (Latest)">
                          <option value="gemini-3-pro-preview">
                            Gemini 3 Pro Preview (Most Powerful)
                          </option>
                        </optgroup>
                        <optgroup label="Gemini 2.5 (Recommended)">
                          <option value="gemini-2.5-flash">
                            Gemini 2.5 Flash (Default - Fast & Smart)
                          </option>
                          <option value="gemini-2.5-flash-lite">
                            Gemini 2.5 Flash-Lite (Fastest & Cheapest)
                          </option>
                          <option value="gemini-2.5-pro">
                            Gemini 2.5 Pro (Advanced Reasoning)
                          </option>
                        </optgroup>
                        <optgroup label="Gemini 2.0">
                          <option value="gemini-2.0-flash">Gemini 2.0 Flash (Stable)</option>
                        </optgroup>
                        <optgroup label="Legacy Models">
                          <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                          <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                        </optgroup>
                      </select>
                      <div className="mt-2 text-xs text-secondary">
                        {settings.geminiModel === 'gemini-3-pro-preview' && (
                          <span>🚀 Most powerful model with multimodal & reasoning</span>
                        )}
                        {settings.geminiModel === 'gemini-2.5-flash' && (
                          <span>⚡ Best price-performance - smart, fast, affordable</span>
                        )}
                        {settings.geminiModel === 'gemini-2.5-flash-lite' && (
                          <span>💨 Ultra-fast and cost-efficient</span>
                        )}
                        {settings.geminiModel === 'gemini-2.5-pro' && (
                          <span>🎯 State-of-the-art reasoning for complex tasks</span>
                        )}
                        {settings.geminiModel === 'gemini-2.0-flash' && (
                          <span>✅ Stable workhorse with 1M context window</span>
                        )}
                        {(settings.geminiModel === 'gemini-1.5-pro' ||
                          settings.geminiModel === 'gemini-1.5-flash') && (
                            <span>📦 Legacy model - consider upgrading to 2.5</span>
                          )}
                      </div>
                    </label>

                    <label className="block">
                      <span className="text-xs font-bold text-muted uppercase tracking-wider">
                        API Key
                      </span>
                      <div className="mt-2">
                        <ApiKeyInput
                          value={settings.geminiApiKey}
                          onChange={(value) => updateSetting('geminiApiKey', value)}
                          placeholder="Enter your Gemini API key"
                        />
                      </div>
                    </label>
                    <p className="text-xs text-muted">
                      Get your API key from{' '}
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        className="text-accent hover:underline"
                      >
                        Google AI Studio
                      </a>
                    </p>
                  </div>
                )}



                {/* AWS Bedrock Config */}
                {settings.provider === 'bedrock' && (
                  <div className="space-y-4">
                    {/* Model Selection */}
                    <label className="block">
                      <span className="text-xs font-bold text-muted uppercase tracking-wider">
                        Model
                      </span>
                      <select
                        value={settings.bedrockModel}
                        onChange={(e) => updateSetting('bedrockModel', e.target.value)}
                        className="mt-2 w-full bg-tertiary border border-border rounded-lg px-4 py-3 text-sm text-primary focus:outline-none focus:border-accent"
                      >
                        <optgroup label="Claude 4 (Latest)">
                          <option value="anthropic.claude-sonnet-4-20250514-v1:0">
                            Claude Sonnet 4 (Latest)
                          </option>
                          <option value="anthropic.claude-opus-4-20250514-v1:0">
                            Claude Opus 4
                          </option>
                        </optgroup>
                        <optgroup label="Claude 3.7">
                          <option value="anthropic.claude-3-7-sonnet-20250219-v1:0">
                            Claude 3.7 Sonnet
                          </option>
                        </optgroup>
                        <optgroup label="Claude 3.5">
                          <option value="anthropic.claude-3-5-sonnet-20241022-v2:0">
                            Claude 3.5 Sonnet v2
                          </option>
                          <option value="anthropic.claude-3-5-haiku-20241022-v1:0">
                            Claude 3.5 Haiku
                          </option>
                        </optgroup>
                        <optgroup label="Claude 3">
                          <option value="anthropic.claude-3-opus-20240229-v1:0">
                            Claude 3 Opus
                          </option>
                          <option value="anthropic.claude-3-haiku-20240307-v1:0">
                            Claude 3 Haiku
                          </option>
                        </optgroup>
                        <optgroup label="Amazon Nova">
                          <option value="amazon.nova-premier-v1:0">Amazon Nova Premier</option>
                          <option value="amazon.nova-pro-v1:0">Amazon Nova Pro</option>
                          <option value="amazon.nova-lite-v1:0">Amazon Nova Lite</option>
                          <option value="amazon.nova-micro-v1:0">Amazon Nova Micro</option>
                        </optgroup>
                        <optgroup label="Meta Llama 4">
                          <option value="meta.llama4-scout-17b-instruct-v1:0">
                            Llama 4 Scout 17B
                          </option>
                          <option value="meta.llama4-maverick-17b-instruct-v1:0">
                            Llama 4 Maverick 17B
                          </option>
                        </optgroup>
                        <optgroup label="Meta Llama 3.3">
                          <option value="meta.llama3-3-70b-instruct-v1:0">
                            Llama 3.3 70B Instruct
                          </option>
                        </optgroup>
                        <optgroup label="Mistral">
                          <option value="mistral.mistral-large-2411-v1:0">
                            Mistral Large (24.11)
                          </option>
                          <option value="mistral.pixtral-large-2502-v1:0">
                            Pixtral Large (25.02)
                          </option>
                        </optgroup>
                        <optgroup label="DeepSeek">
                          <option value="deepseek.r1-v1:0">DeepSeek R1</option>
                        </optgroup>
                      </select>
                    </label>

                    {/* Region */}
                    <label className="block">
                      <span className="text-xs font-bold text-muted uppercase tracking-wider">
                        Region
                      </span>
                      <select
                        value={settings.awsRegion}
                        onChange={(e) => updateSetting('awsRegion', e.target.value)}
                        className="mt-2 w-full bg-tertiary border border-border rounded-lg px-4 py-3 text-sm text-primary focus:outline-none focus:border-accent"
                      >
                        <option value="us-east-1">US East (N. Virginia)</option>
                        <option value="us-east-2">US East (Ohio)</option>
                        <option value="us-west-2">US West (Oregon)</option>
                        <option value="eu-west-1">Europe (Ireland)</option>
                        <option value="eu-west-2">Europe (London)</option>
                        <option value="eu-west-3">Europe (Paris)</option>
                        <option value="eu-central-1">Europe (Frankfurt)</option>
                        <option value="ap-south-1">Asia Pacific (Mumbai)</option>
                        <option value="ap-northeast-1">Asia Pacific (Tokyo)</option>
                        <option value="ap-northeast-2">Asia Pacific (Seoul)</option>
                        <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                        <option value="ap-southeast-2">Asia Pacific (Sydney)</option>
                      </select>
                    </label>

                    {/* Cross-Region Inference */}
                    <label className="flex items-center justify-between p-3 bg-secondary border border-border rounded-lg cursor-pointer hover:border-muted transition-all">
                      <div>
                        <div className="text-sm font-medium text-primary">
                          Cross-Region Inference
                        </div>
                        <div className="text-xs text-muted">
                          Route requests to other regions if capacity is limited
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.bedrockCrossRegionInference}
                        onChange={(e) =>
                          updateSetting('bedrockCrossRegionInference', e.target.checked)
                        }
                        className="w-5 h-5 accent-accent rounded"
                      />
                    </label>

                    {/* Use AWS Profile */}
                    <label className="flex items-center justify-between p-3 bg-secondary border border-border rounded-lg cursor-pointer hover:border-muted transition-all">
                      <div>
                        <div className="text-sm font-medium text-primary">Use AWS Profile</div>
                        <div className="text-xs text-muted">
                          Use credentials from ~/.aws/credentials
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.awsUseProfile}
                        onChange={(e) => updateSetting('awsUseProfile', e.target.checked)}
                        className="w-5 h-5 accent-accent rounded"
                      />
                    </label>

                    {settings.awsUseProfile ? (
                      <label className="block">
                        <span className="text-xs font-bold text-muted uppercase tracking-wider">
                          AWS Profile Name
                        </span>
                        <input
                          type="text"
                          value={settings.awsProfile}
                          onChange={(e) => updateSetting('awsProfile', e.target.value)}
                          placeholder="default"
                          className="mt-2 w-full bg-tertiary border border-border rounded-lg px-4 py-3 text-sm text-primary placeholder-muted focus:outline-none focus:border-accent"
                        />
                      </label>
                    ) : (
                      <>
                        <label className="block">
                          <span className="text-xs font-bold text-muted uppercase tracking-wider">
                            AWS Access Key
                          </span>
                          <div className="mt-2">
                            <ApiKeyInput
                              value={settings.awsAccessKey}
                              onChange={(value) => updateSetting('awsAccessKey', value)}
                              placeholder="AKIA..."
                            />
                          </div>
                        </label>
                        <label className="block">
                          <span className="text-xs font-bold text-muted uppercase tracking-wider">
                            AWS Secret Key
                          </span>
                          <div className="mt-2">
                            <ApiKeyInput
                              value={settings.awsSecretKey}
                              onChange={(value) => updateSetting('awsSecretKey', value)}
                              placeholder="Enter your secret key"
                            />
                          </div>
                        </label>
                        <label className="block">
                          <span className="text-xs font-bold text-muted uppercase tracking-wider">
                            Session Token <span className="text-muted font-normal">(optional)</span>
                          </span>
                          <div className="mt-2">
                            <ApiKeyInput
                              value={settings.awsSessionToken}
                              onChange={(value) => updateSetting('awsSessionToken', value)}
                              placeholder="For temporary credentials (STS)"
                            />
                          </div>
                        </label>
                      </>
                    )}

                    {/* VPC Endpoint */}
                    <label className="flex items-center justify-between p-3 bg-secondary border border-border rounded-lg cursor-pointer hover:border-muted transition-all">
                      <div>
                        <div className="text-sm font-medium text-primary">Use VPC Endpoint</div>
                        <div className="text-xs text-muted">
                          Connect to Bedrock through a VPC endpoint
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.bedrockUseVpcEndpoint}
                        onChange={(e) => updateSetting('bedrockUseVpcEndpoint', e.target.checked)}
                        className="w-5 h-5 accent-accent rounded"
                      />
                    </label>

                    {settings.bedrockUseVpcEndpoint && (
                      <label className="block">
                        <span className="text-xs font-bold text-muted uppercase tracking-wider">
                          VPC Endpoint URL
                        </span>
                        <input
                          type="text"
                          value={settings.bedrockVpcEndpoint}
                          onChange={(e) => updateSetting('bedrockVpcEndpoint', e.target.value)}
                          placeholder="https://vpce-xxx.bedrock-runtime.us-east-1.vpce.amazonaws.com"
                          className="mt-2 w-full bg-tertiary border border-border rounded-lg px-4 py-3 text-sm text-primary placeholder-muted focus:outline-none focus:border-accent"
                        />
                      </label>
                    )}

                    <p className="text-xs text-secondary mt-4">
                      Ensure you have Bedrock model access enabled in your AWS account.{' '}
                      <a
                        href="https://console.aws.amazon.com/bedrock/home#/modelaccess"
                        className="text-accent hover:underline"
                      >
                        Manage Model Access
                      </a>
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === 'artifacts' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-primary mb-4">Artifact Generation</h3>
                <p className="text-xs text-muted mb-4">
                  Configure what artifacts Personaut generates when analyzing your product.
                </p>

                <div className="space-y-4">
                  <label className="flex items-center justify-between p-3 bg-secondary border border-border rounded-lg cursor-pointer hover:border-muted transition-all">
                    <div>
                      <div className="text-sm font-medium text-primary">Generate Backstories</div>
                      <div className="text-xs text-muted">
                        Create detailed backstories for each persona
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.artifacts.generateBackstories}
                      onChange={(e) =>
                        updateArtifactSetting('generateBackstories', e.target.checked)
                      }
                      className="w-5 h-5 accent-accent rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 bg-secondary border border-border rounded-lg cursor-pointer hover:border-muted transition-all">
                    <div>
                      <div className="text-sm font-medium text-primary">Generate Feedback</div>
                      <div className="text-xs text-muted">
                        Auto-generate persona feedback on features
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.artifacts.generateFeedback}
                      onChange={(e) => updateArtifactSetting('generateFeedback', e.target.checked)}
                      className="w-5 h-5 accent-accent rounded"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 bg-secondary border border-border rounded-lg cursor-pointer hover:border-muted transition-all">
                    <div>
                      <div className="text-sm font-medium text-primary">Save to Workspace</div>
                      <div className="text-xs text-muted">
                        Save generated artifacts as files in your project
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.artifacts.saveToWorkspace}
                      onChange={(e) => updateArtifactSetting('saveToWorkspace', e.target.checked)}
                      className="w-5 h-5 accent-accent rounded"
                    />
                  </label>
                </div>

                <div className="mt-6">
                  <label className="block">
                    <span className="text-xs font-bold text-muted uppercase tracking-wider">
                      Output Format
                    </span>
                    <select
                      value={settings.artifacts.outputFormat}
                      onChange={(e) =>
                        updateArtifactSetting('outputFormat', e.target.value as 'markdown' | 'json')
                      }
                      className="mt-2 w-full bg-tertiary border border-border rounded-lg px-4 py-3 text-sm text-primary focus:outline-none focus:border-accent"
                    >
                      <option value="markdown">Markdown</option>
                      <option value="json">JSON</option>
                    </select>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'data' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-primary mb-4">Data Management</h3>
                <p className="text-xs text-muted mb-4">
                  Manage your stored data, including personas, history, and settings.
                </p>

                <div className="p-4 rounded-lg border border-red-900/30 bg-red-900/10">
                  <h4 className="text-sm font-medium text-red-400 mb-2">Reset Extension Data</h4>
                  <p className="text-xs text-secondary mb-4">
                    This will clear all saved <strong className="text-red-400">personas</strong>,{' '}
                    <strong className="text-red-400">feedback history</strong>, and{' '}
                    <strong className="text-red-400">extension settings</strong>. This action cannot
                    be undone.
                  </p>
                  <button
                    onClick={() => {
                      console.log('[SettingsTab] Clear All Data button clicked');
                      setShowClearDataConfirm(true);
                    }}
                    className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors shadow-sm"
                  >
                    Clear All Data
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Clear Data Confirmation Modal */}
          {showClearDataConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-[2px] animate-fadeIn">
              <div className="relative w-full max-w-sm bg-primary border border-red-500/20 rounded-2xl shadow-2xl overflow-hidden transform transition-all">
                {/* Decorative top strip */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-red-500 to-red-600"></div>

                <div className="p-6">
                  <div className="flex flex-col items-center text-center">
                    {/* Icon with glow */}
                    <div className="flex items-center justify-center w-14 h-14 mb-4 rounded-full bg-red-500/10 text-red-500 ring-1 ring-red-500/20 shadow-[0_0_15px_-3px_rgba(239,68,68,0.2)]">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="28"
                        height="28"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                    </div>

                    <h3 className="text-lg font-bold text-primary mb-2">Clear all data?</h3>

                    <p className="text-sm text-secondary mb-6 leading-relaxed">
                      This will permanently delete all your{' '}
                      <strong className="text-red-400 font-medium">personas</strong>,{' '}
                      <strong className="text-red-400 font-medium">feedback</strong>, and{' '}
                      <strong className="text-red-400 font-medium">settings</strong>.
                      <br />
                      This action cannot be undone.
                    </p>

                    <div className="grid grid-cols-2 gap-3 w-full">
                      <button
                        onClick={() => setShowClearDataConfirm(false)}
                        className="col-span-1 px-4 py-2.5 text-sm font-semibold text-secondary bg-tertiary hover:bg-secondary border border-border rounded-lg transition-all duration-200"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          console.log(
                            '[SettingsTab] User confirmed, sending reset-all-data message'
                          );
                          vscode.postMessage({ type: 'reset-all-data' });
                          setShowClearDataConfirm(false);
                        }}
                        className="col-span-1 px-4 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-500 rounded-lg shadow-lg shadow-red-900/20 transition-all duration-200"
                      >
                        Delete All
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'about' && (
            <div className="space-y-6">
              <div className="text-center py-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-xl border border-border bg-secondary flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-accent"
                  >
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-primary mb-2">Personaut</h3>
                <p className="text-sm text-muted">Version 0.0.1</p>
              </div>

              <div className="bg-secondary border border-border rounded-lg p-4">
                <h4 className="text-sm font-semibold text-primary mb-2">About</h4>
                <p className="text-xs text-secondary leading-relaxed">
                  Personaut helps you build products for real people, not imaginary users. Create
                  detailed customer personas with dynamic demographics, and get AI-powered feedback
                  from their perspective.
                </p>
              </div>

              <div className="bg-secondary border border-border rounded-lg p-4">
                <h4 className="text-sm font-semibold text-primary mb-2">Features</h4>
                <ul className="text-xs text-secondary space-y-2">
                  <li className="flex items-start gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-accent mt-0.5 flex-shrink-0"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Create unlimited customer personas with custom attributes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-accent mt-0.5 flex-shrink-0"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Generate detailed backstories for each persona</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-accent mt-0.5 flex-shrink-0"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Get AI feedback from your personas' perspectives</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-accent mt-0.5 flex-shrink-0"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Integrate with multiple AI providers</span>
                  </li>
                </ul>
              </div>

              <div className="bg-secondary border border-border rounded-lg p-4">
                <h4 className="text-sm font-semibold text-primary mb-2">Links</h4>
                <div className="space-y-2">
                  <a
                    href="https://github.com/Personaut/Personaut"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-secondary hover:text-accent transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                    </svg>
                    GitHub Repository
                  </a>
                  <a
                    href="https://github.com/Personaut/Personaut/wiki"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-secondary hover:text-accent transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                    Documentation
                  </a>
                  <a
                    href="https://github.com/Personaut/Personaut/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-secondary hover:text-accent transition-colors"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    Report an Issue
                  </a>
                </div>
              </div>

              <div className="text-center text-xs text-muted pt-4">Built by the Personaut Team</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
