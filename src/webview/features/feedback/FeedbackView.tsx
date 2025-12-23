import React, { useCallback, useState } from 'react';
import { Spinner } from '../../shared/components/ui';
import {
  FeedbackDisplay,
  FeedbackHistoryList,
} from './components';
import { useFeedbackState } from './hooks';
import { FeedbackPersona, ScreenshotData } from './types';

/**
 * FeedbackView component props
 */
export interface FeedbackViewProps {
  /** Available personas for feedback */
  personas: FeedbackPersona[];
  /** Handler for generating feedback */
  onGenerateFeedback?: (
    screenshot: ScreenshotData,
    personaIds: string[],
    context: string
  ) => void;
  /** Handler for URL capture */
  onCaptureUrl?: (url: string) => void;
  /** Whether capture is in progress */
  isCapturing?: boolean;
}

// CSS Variables for VS Code theming
const vscodeVars = {
  background: 'var(--vscode-editor-background, #1e1e1e)',
  inputBackground: 'var(--vscode-input-background, #3c3c3c)',
  inputForeground: 'var(--vscode-input-foreground, #cccccc)',
  inputBorder: 'var(--vscode-input-border, #3c3c3c)',
  buttonBackground: 'var(--vscode-button-background, #0e639c)',
  buttonForeground: 'var(--vscode-button-foreground, #ffffff)',
  buttonHoverBackground: 'var(--vscode-button-hoverBackground, #1177bb)',
  panelBorder: 'var(--vscode-panel-border, #454545)',
  foreground: 'var(--vscode-foreground, #cccccc)',
  descriptionForeground: 'var(--vscode-descriptionForeground, #8b8b8b)',
  focusBorder: 'var(--vscode-focusBorder, #007fd4)',
  listActiveBackground: 'var(--vscode-list-activeSelectionBackground, #094771)',
  listHoverBackground: 'var(--vscode-list-hoverBackground, #2a2d2e)',
  badgeBackground: 'var(--vscode-badge-background, #4d4d4d)',
  errorForeground: 'var(--vscode-errorForeground, #f48771)',
  warningForeground: 'var(--vscode-editorWarning-foreground, #cca700)',
};

type CaptureTab = 'screenshot' | 'url' | 'file';

const QUICK_PROMPTS = [
  { label: '🎯 Focus UI', value: 'Focus on UI design and visual clarity.' },
  { label: '♿ Accessibility', value: 'Check for accessibility issues and WCAG compliance.' },
  { label: '📱 Mobile UX', value: 'Review mobile responsiveness and touch interactions.' },
  { label: '⚡ Performance', value: 'Analyze perceived performance and loading states.' },
];

/**
 * FeedbackView - IDE-native command center for feedback generation
 */
export function FeedbackView({
  personas,
  onGenerateFeedback,
  onCaptureUrl,
  isCapturing = false,
}: FeedbackViewProps) {
  const {
    state,
    setScreenshot,
    togglePersonaSelection,
    setContext,
    setViewMode,
    clearGeneratedFeedback,
    deleteFeedbackEntry,
    resetForm,
    canGenerateFeedback,
    setLoading,
    setError,
  } = useFeedbackState();

  const [captureTab, setCaptureTab] = useState<CaptureTab>('file');
  const [urlInput, setUrlInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Styles using VS Code theming
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    maxHeight: '100vh',
    backgroundColor: vscodeVars.background,
    fontFamily: 'var(--vscode-font-family, -apple-system, BlinkMacSystemFont, sans-serif)',
    fontSize: 'var(--vscode-font-size, 13px)',
    color: vscodeVars.foreground,
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    borderBottom: `1px solid ${vscodeVars.panelBorder}`,
    backgroundColor: vscodeVars.background,
  };

  const mainContentStyle: React.CSSProperties = {
    flex: 1,
    overflow: 'auto',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  };

  const sectionStyle: React.CSSProperties = {
    backgroundColor: vscodeVars.inputBackground,
    border: `1px solid ${vscodeVars.panelBorder}`,
    borderRadius: '4px',
    overflow: 'hidden',
  };

  const sectionHeaderStyle: React.CSSProperties = {
    padding: '8px 12px',
    borderBottom: `1px solid ${vscodeVars.panelBorder}`,
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: vscodeVars.descriptionForeground,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  };

  const tabBarStyle: React.CSSProperties = {
    display: 'flex',
    borderBottom: `1px solid ${vscodeVars.panelBorder}`,
  };

  const tabStyle = (isActive: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: isActive ? 600 : 400,
    color: isActive ? vscodeVars.foreground : vscodeVars.descriptionForeground,
    backgroundColor: isActive ? vscodeVars.inputBackground : 'transparent',
    border: 'none',
    borderBottom: isActive ? `2px solid ${vscodeVars.focusBorder}` : '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  });

  const dropZoneStyle: React.CSSProperties = {
    padding: '24px',
    textAlign: 'center',
    cursor: 'pointer',
    backgroundColor: isDragging ? vscodeVars.listHoverBackground : 'transparent',
    border: `2px dashed ${isDragging ? vscodeVars.focusBorder : vscodeVars.panelBorder}`,
    borderRadius: '4px',
    margin: '12px',
    transition: 'all 0.2s ease',
  };

  const previewStyle: React.CSSProperties = {
    padding: '12px',
  };

  const imagePreviewStyle: React.CSSProperties = {
    width: '100%',
    maxHeight: '150px',
    objectFit: 'contain',
    borderRadius: '4px',
    backgroundColor: vscodeVars.background,
  };

  const personaContainerStyle: React.CSSProperties = {
    display: 'flex',
    overflowX: 'auto',
    gap: '8px',
    padding: '12px',
    scrollbarWidth: 'thin',
  };

  const personaChipStyle = (isSelected: boolean, isDisabled: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    backgroundColor: isSelected ? vscodeVars.listActiveBackground : vscodeVars.background,
    border: `1px solid ${isSelected ? vscodeVars.focusBorder : vscodeVars.panelBorder}`,
    borderRadius: '16px',
    cursor: isDisabled && !isSelected ? 'not-allowed' : 'pointer',
    opacity: isDisabled && !isSelected ? 0.5 : 1,
    whiteSpace: 'nowrap',
    fontSize: '12px',
    transition: 'all 0.15s ease',
    flexShrink: 0,
  });

  const contextAreaStyle: React.CSSProperties = {
    width: '100%',
    minHeight: '80px',
    padding: '10px',
    backgroundColor: vscodeVars.background,
    border: `1px solid ${vscodeVars.panelBorder}`,
    borderRadius: '4px',
    color: vscodeVars.inputForeground,
    fontSize: '12px',
    fontFamily: 'var(--vscode-editor-font-family, Consolas, "Courier New", monospace)',
    resize: 'vertical',
    outline: 'none',
  };

  const quickPromptBarStyle: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    padding: '8px 12px',
    borderBottom: `1px solid ${vscodeVars.panelBorder}`,
  };

  const quickPromptStyle: React.CSSProperties = {
    padding: '4px 8px',
    fontSize: '11px',
    backgroundColor: vscodeVars.badgeBackground,
    border: 'none',
    borderRadius: '3px',
    color: vscodeVars.foreground,
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  };

  const actionBarStyle: React.CSSProperties = {
    position: 'sticky',
    bottom: 0,
    padding: '12px',
    borderTop: `1px solid ${vscodeVars.panelBorder}`,
    backgroundColor: vscodeVars.background,
    display: 'flex',
    gap: '8px',
  };

  const generateButtonStyle: React.CSSProperties = {
    flex: 1,
    padding: '10px 16px',
    fontSize: '13px',
    fontWeight: 600,
    backgroundColor: canGenerateFeedback ? vscodeVars.buttonBackground : vscodeVars.badgeBackground,
    color: canGenerateFeedback ? vscodeVars.buttonForeground : vscodeVars.descriptionForeground,
    border: 'none',
    borderRadius: '4px',
    cursor: canGenerateFeedback ? 'pointer' : 'not-allowed',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.15s ease',
  };

  // File handling
  const handleFileSelect = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        setScreenshot({
          url: e.target?.result as string,
          source: 'file',
          fileName: file.name,
          capturedAt: Date.now(),
        });
      };
      reader.readAsDataURL(file);
    },
    [setScreenshot]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleUrlCapture = useCallback(() => {
    if (urlInput.trim() && onCaptureUrl) {
      onCaptureUrl(urlInput.trim());
    }
  }, [urlInput, onCaptureUrl]);

  const handleGenerate = useCallback(() => {
    if (state.screenshot && state.selectedPersonaIds.length > 0 && onGenerateFeedback) {
      setLoading(true);
      setError(null);
      onGenerateFeedback(state.screenshot, state.selectedPersonaIds, state.context);
    }
  }, [state.screenshot, state.selectedPersonaIds, state.context, onGenerateFeedback, setLoading, setError]);

  const handleCopy = useCallback(() => {
    const text = state.generatedFeedback
      .map((f) => `${f.personaName} (${f.rating}/5):\n${f.comment}`)
      .join('\n\n');
    navigator.clipboard.writeText(text);
  }, [state.generatedFeedback]);

  const appendToContext = (text: string) => {
    setContext(state.context ? `${state.context}\n${text}` : text);
  };

  const getPersonaTooltip = (persona: FeedbackPersona) => {
    return persona.occupation || persona.description || persona.name;
  };

  const isAtPersonaLimit = state.selectedPersonaIds.length >= 5;

  // View mode tabs
  const viewTabs = [
    { id: 'form', label: 'Generate', icon: '✨', disabled: false },
    { id: 'results', label: 'Results', icon: '📊', disabled: state.generatedFeedback.length === 0 },
    { id: 'history', label: `History (${state.feedbackHistory.length})`, icon: '📋', disabled: false },
  ] as const;


  // Results view
  if (state.viewMode === 'results') {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>
          <span style={{ fontWeight: 600, fontSize: '13px' }}>Feedback Results</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {viewTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => !tab.disabled && setViewMode(tab.id as 'form' | 'results' | 'history')}
                disabled={tab.disabled}
                style={{
                  padding: '4px 8px',
                  fontSize: '11px',
                  backgroundColor: state.viewMode === tab.id ? vscodeVars.buttonBackground : 'transparent',
                  color: state.viewMode === tab.id ? vscodeVars.buttonForeground : vscodeVars.descriptionForeground,
                  border: 'none',
                  borderRadius: '3px',
                  cursor: tab.disabled ? 'not-allowed' : 'pointer',
                  opacity: tab.disabled ? 0.5 : 1,
                }}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
          <FeedbackDisplay
            feedback={state.generatedFeedback}
            summary={state.feedbackSummary}
            onCopy={handleCopy}
            onClear={clearGeneratedFeedback}
          />
        </div>
      </div>
    );
  }

  if (state.viewMode === 'history') {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>
          <span style={{ fontWeight: 600, fontSize: '13px' }}>Feedback History</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {viewTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => !tab.disabled && setViewMode(tab.id as 'form' | 'results' | 'history')}
                disabled={tab.disabled}
                style={{
                  padding: '4px 8px',
                  fontSize: '11px',
                  backgroundColor: state.viewMode === tab.id ? vscodeVars.buttonBackground : 'transparent',
                  color: state.viewMode === tab.id ? vscodeVars.buttonForeground : vscodeVars.descriptionForeground,
                  border: 'none',
                  borderRadius: '3px',
                  cursor: tab.disabled ? 'not-allowed' : 'pointer',
                  opacity: tab.disabled ? 0.5 : 1,
                }}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
          <FeedbackHistoryList entries={state.feedbackHistory} onDelete={deleteFeedbackEntry} />
        </div>
      </div>
    );
  }


  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <span style={{ fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Feedback
        </span>
        <div style={{ display: 'flex', gap: '4px' }}>
          {viewTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && setViewMode(tab.id as 'form' | 'results' | 'history')}
              disabled={tab.disabled}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                backgroundColor: state.viewMode === tab.id ? vscodeVars.buttonBackground : 'transparent',
                color: state.viewMode === tab.id ? vscodeVars.buttonForeground : vscodeVars.descriptionForeground,
                border: 'none',
                borderRadius: '3px',
                cursor: tab.disabled ? 'not-allowed' : 'pointer',
                opacity: tab.disabled ? 0.5 : 1,
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div style={mainContentStyle}>
        {/* MEDIA ZONE - Tabbed Capture Interface */}
        <div style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            MEDIA SOURCE
          </div>

          {/* Capture Tabs */}
          <div style={tabBarStyle}>
            <button style={tabStyle(captureTab === 'screenshot')} onClick={() => setCaptureTab('screenshot')}>
              📷 Active Screen
            </button>
            <button style={tabStyle(captureTab === 'url')} onClick={() => setCaptureTab('url')}>
              🔗 URL
            </button>
            <button style={tabStyle(captureTab === 'file')} onClick={() => setCaptureTab('file')}>
              📁 Local File
            </button>
          </div>

          {/* Capture Content */}
          {state.screenshot ? (
            <div style={previewStyle}>
              <img src={state.screenshot.url} alt="Preview" style={imagePreviewStyle} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                <span style={{ fontSize: '11px', color: vscodeVars.descriptionForeground }}>
                  {state.screenshot.source === 'file' && `📁 ${state.screenshot.fileName}`}
                  {state.screenshot.source === 'url' && '🔗 Captured from URL'}
                  {state.screenshot.source === 'clipboard' && '📋 From clipboard'}
                </span>
                <button
                  onClick={() => setScreenshot(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: vscodeVars.errorForeground,
                    cursor: 'pointer',
                    fontSize: '11px',
                  }}
                >
                  ✕ Remove
                </button>
              </div>
            </div>
          ) : (
            <>
              {captureTab === 'screenshot' && (
                <div style={{ padding: '24px', textAlign: 'center' }}>
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={vscodeVars.descriptionForeground}
                    strokeWidth="1.5"
                    style={{ marginBottom: '8px', opacity: 0.5 }}
                  >
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  <p style={{ fontSize: '12px', color: vscodeVars.descriptionForeground, marginBottom: '12px' }}>
                    Capture the active editor or webview
                  </p>
                  <button
                    style={{
                      padding: '8px 16px',
                      backgroundColor: vscodeVars.buttonBackground,
                      color: vscodeVars.buttonForeground,
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                    onClick={() => {
                      // Would trigger active screen capture
                    }}
                  >
                    📷 Capture Screen
                  </button>
                </div>
              )}

              {captureTab === 'url' && (
                <div style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleUrlCapture()}
                      placeholder="https://example.com"
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        backgroundColor: vscodeVars.background,
                        border: `1px solid ${vscodeVars.panelBorder}`,
                        borderRadius: '4px',
                        color: vscodeVars.inputForeground,
                        fontSize: '12px',
                        outline: 'none',
                      }}
                    />
                    <button
                      onClick={handleUrlCapture}
                      disabled={!urlInput.trim() || isCapturing}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: urlInput.trim() ? vscodeVars.buttonBackground : vscodeVars.badgeBackground,
                        color: urlInput.trim() ? vscodeVars.buttonForeground : vscodeVars.descriptionForeground,
                        border: 'none',
                        borderRadius: '4px',
                        cursor: urlInput.trim() ? 'pointer' : 'not-allowed',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      {isCapturing ? <Spinner size="sm" /> : '📷'} Capture
                    </button>
                  </div>
                </div>
              )}

              {captureTab === 'file' && (
                <div
                  style={dropZoneStyle}
                  onDrop={handleDrop}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(file);
                    }}
                  />
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={isDragging ? vscodeVars.focusBorder : vscodeVars.descriptionForeground}
                    strokeWidth="1.5"
                    style={{ marginBottom: '8px', transition: 'all 0.2s ease' }}
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <p style={{ fontSize: '12px', color: vscodeVars.descriptionForeground }}>
                    Drop image here or <span style={{ color: vscodeVars.focusBorder }}>click to browse</span>
                  </p>
                  <p style={{ fontSize: '11px', color: vscodeVars.descriptionForeground, opacity: 0.7, marginTop: '4px' }}>
                    PNG, JPG, GIF, WebP
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* CONFIGURATION ZONE */}
        {/* Persona Selection */}
        <div style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            PERSONAS
            <span style={{ marginLeft: 'auto', fontSize: '10px', color: isAtPersonaLimit ? vscodeVars.warningForeground : vscodeVars.descriptionForeground }}>
              {state.selectedPersonaIds.length}/5
            </span>
          </div>

          {personas.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', color: vscodeVars.descriptionForeground, fontSize: '12px' }}>
              No personas available. Generate in Build mode.
            </div>
          ) : (
            <div style={personaContainerStyle}>
              {personas.map((persona) => {
                const isSelected = state.selectedPersonaIds.includes(persona.id);
                const isDisabled = !isSelected && isAtPersonaLimit;

                return (
                  <div
                    key={persona.id}
                    style={personaChipStyle(isSelected, isDisabled)}
                    onClick={() => !state.isLoading && togglePersonaSelection(persona.id)}
                    title={getPersonaTooltip(persona)}
                    role="checkbox"
                    aria-checked={isSelected}
                  >
                    {isSelected && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={vscodeVars.focusBorder} strokeWidth="1.5">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                    <span
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: isSelected ? vscodeVars.focusBorder : vscodeVars.badgeBackground,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '9px',
                        fontWeight: 700,
                        color: isSelected ? vscodeVars.buttonForeground : vscodeVars.foreground,
                      }}
                    >
                      {persona.name.slice(0, 2).toUpperCase()}
                    </span>
                    <span style={{ fontSize: '12px' }}>{persona.name}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Context Input */}
        <div style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            CONTEXT
            <span style={{ marginLeft: 'auto', fontSize: '10px', color: vscodeVars.descriptionForeground }}>optional</span>
          </div>

          {/* Quick Prompts */}
          <div style={quickPromptBarStyle}>
            {QUICK_PROMPTS.map((prompt, i) => (
              <button key={i} style={quickPromptStyle} onClick={() => appendToContext(prompt.value)} title={prompt.value}>
                {prompt.label}
              </button>
            ))}
          </div>

          <div style={{ padding: '12px' }}>
            <textarea
              value={state.context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Add specific questions or areas to focus on..."
              style={contextAreaStyle}
              disabled={state.isLoading}
            />
          </div>
        </div>

        {/* Error Display */}
        {state.error && (
          <div
            style={{
              padding: '10px 12px',
              backgroundColor: `${vscodeVars.errorForeground}15`,
              border: `1px solid ${vscodeVars.errorForeground}`,
              borderRadius: '4px',
              color: vscodeVars.errorForeground,
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {state.error}
          </div>
        )}
      </div>

      {/* STICKY ACTION BAR */}
      <div style={actionBarStyle}>
        <button
          style={generateButtonStyle}
          onClick={handleGenerate}
          disabled={!canGenerateFeedback || state.isLoading}
        >
          {state.isLoading ? (
            <>
              <Spinner size="sm" />
              Generating...
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
              Generate Feedback
            </>
          )}
        </button>
        {(state.screenshot || state.selectedPersonaIds.length > 0) && (
          <button
            onClick={resetForm}
            disabled={state.isLoading}
            style={{
              padding: '10px 16px',
              backgroundColor: 'transparent',
              border: `1px solid ${vscodeVars.panelBorder}`,
              borderRadius: '4px',
              color: vscodeVars.foreground,
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

export default FeedbackView;
