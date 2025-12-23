/**
 * App - Main Application Shell
 *
 * This is a refactored, slim version of the application that delegates
 * to feature-specific view components instead of containing all logic inline.
 *
 * Architecture:
 * - App.tsx: Routing shell (~400 lines) - handles mode/view switching
 * - Features: Self-contained modules with their own state management
 *   - BuildView: Build mode with stages
 *   - ChatView: Chat mode with messages
 *   - FeedbackView: Feedback generation
 *   - SettingsView: Settings management
 *   - UserBaseView: Persona management
 *
 * **Validates: Requirements 1.4, 13.1-13.5**
 */
import React, { useState, useEffect, useCallback } from 'react';
import { colors, spacing, typography, borderRadius } from './shared/theme';
import { BuildView, ChatView, FeedbackView, SettingsView, UserBaseView } from './features';
import { BuildLogEntry } from './features/build/types';
import { ChatPersona } from './features/chat/types';
import { FeedbackPersona } from './features/feedback/types';
import { useVSCode } from './shared/hooks/useVSCode';

// VS Code API type declarations
declare global {
    interface Window {
        logoUri: string;
        iconUri: string;
    }
}

// Types
type AppMode = 'chat' | 'feedback' | 'build';
type AppView = 'main' | 'history' | 'userbase' | 'settings';

interface Settings {
    autoRead: boolean;
    autoWrite: boolean;
    autoExecute: boolean;
    rateLimit?: number;
    rateLimitWarningThreshold?: number;
    userMessageColor?: string;
    agentMessageColor?: string;
}

interface Usage {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
}

const DEFAULT_SETTINGS: Settings = {
    autoRead: true,
    autoWrite: true,
    autoExecute: true,
    rateLimit: 100000,
    rateLimitWarningThreshold: 80,
};

/**
 * Main Application Component
 */
export default function App() {
    // Get VS Code API via hook (prevents double acquireVsCodeApi call)
    const { postMessage: vscodePostMessage, getState, setState: vscodeSetState } = useVSCode();

    // Restore state from VS Code
    const savedState = getState() || {};

    // Core navigation state
    const [mode, setMode] = useState<AppMode>((savedState as any).mode || 'chat');
    const [view, setView] = useState<AppView>((savedState as any).view || 'main');

    // Settings and usage
    const [settings, setSettings] = useState<Settings>((savedState as any).settings || DEFAULT_SETTINGS);
    // Don't persist usage - always fetch fresh from backend
    const [usage, setUsage] = useState<Usage>({ inputTokens: 0, outputTokens: 0, totalTokens: 0 });

    // Build logs
    const [buildLogs, setBuildLogs] = useState<BuildLogEntry[]>([]);

    // Active build state (for restoration)
    const [activeBuildState, setActiveBuildState] = useState<any>(null);

    // Project history for build mode
    const [projectHistory, setProjectHistory] = useState<string[]>((savedState as any).projectHistory || []);

    // User personas for chat persona selection
    const [userPersonas, setUserPersonas] = useState<ChatPersona[]>((savedState as any).userPersonas || []);

    // Feedback personas for feedback feature
    const [feedbackPersonas, setFeedbackPersonas] = useState<FeedbackPersona[]>([]);

    // Persist state changes (excluding usage - always fetch fresh)
    useEffect(() => {
        vscodeSetState({
            ...(savedState as object),
            mode,
            view,
            settings,
            // Don't persist usage - it will be fetched fresh on mount
            projectHistory,
        });
    }, [mode, view, settings, projectHistory]);

    // Handle messages from extension
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            switch (message.type) {
                case 'settings-loaded':
                    setSettings(prev => ({ ...prev, ...message.settings }));
                    break;
                // Token usage updates from TokenMonitor (accumulated usage from server)
                case 'token-usage-update':
                    console.log('[App] Received token-usage-update:', message);
                    console.log('[App] conversationId:', message.conversationId);
                    console.log('[App] usage:', message.usage);
                    // Only update header with global usage, ignore conversation-specific updates
                    if (message.usage && (!message.conversationId || message.conversationId === 'global')) {
                        console.log('[App] Accepting token update');
                        // Replace with server-side accumulated values
                        setUsage({
                            inputTokens: message.usage.inputTokens ?? 0,
                            outputTokens: message.usage.outputTokens ?? 0,
                            totalTokens: message.usage.totalTokens ?? 0,
                        });
                    } else {
                        console.log('[App] Rejecting conversation-specific update:', message.conversationId);
                        // Request fresh global usage to replace the rejected conversation-specific update
                        vscodePostMessage({ type: 'get-token-usage' });
                    }
                    break;
                // Token usage updates from Agent (per-call usage)
                // Server-side TokenMonitor handles accumulation, so we can ignore this
                // or use it for immediate display feedback before server update arrives
                case 'usage-update':
                    // Ignore - TokenMonitor will send accumulated values via token-usage-update
                    break;
                // Legacy usage-updated handler (for compatibility)
                case 'usage-updated':
                    setUsage(message.usage);
                    break;
                // Token usage reset confirmation
                case 'token-usage-reset':
                    setUsage({ inputTokens: 0, outputTokens: 0, totalTokens: 0 });
                    break;
                case 'project-history':
                    setProjectHistory(message.history || []);
                    break;
                // Build log messages
                case 'build-log':
                    // Backend sends: { type: 'build-log', entry: { message, type, timestamp } }
                    const logEntry = message.entry || message;
                    setBuildLogs(prev => [...prev, {
                        id: `log-${Date.now()}-${Math.random()}`,
                        timestamp: logEntry.timestamp || Date.now(),
                        type: logEntry.type || message.logType || 'info',
                        stage: logEntry.stage || message.stage || 'build',
                        content: logEntry.message || logEntry.content || '',
                        metadata: logEntry.metadata,
                    }]);
                    break;
                case 'build-logs-loaded':
                    if (message.logs) {
                        setBuildLogs(message.logs.map((log: any, i: number) => ({
                            id: `log-${i}`,
                            timestamp: log.timestamp || Date.now(),
                            type: log.type || 'info',
                            stage: log.stage || 'build',
                            content: log.content,
                        })));
                    }
                    break;
                case 'personas-loaded':
                case 'personas-updated':
                    if (message.personas) {
                        // Convert UserBase personas to ChatPersona format
                        const chatPersonas: ChatPersona[] = message.personas.map((p: any) => ({
                            type: 'user' as const,
                            id: p.id,
                            name: p.name,
                            context: p.background || `${p.occupation || 'User'} - ${p.goals?.join(', ') || 'No goals specified'}`,
                        }));
                        setUserPersonas(chatPersonas);

                        // Also convert to FeedbackPersona format
                        const feedbackPs: FeedbackPersona[] = message.personas.map((p: any) => ({
                            id: p.id,
                            name: p.name,
                            age: p.age || '',
                            occupation: p.occupation || '',
                            description: p.background || '',
                        }));
                        setFeedbackPersonas(feedbackPs);
                    }
                    break;
                case 'active-build-status':
                    console.log('[App] Received active-build-status message:', message);
                    if (message.status) {
                        console.log('[App] Active build detected:', {
                            project: message.status.projectName,
                            step: message.status.currentStep,
                            total: message.status.totalSteps,
                            status: message.status.status,
                        });
                        // Restore build state
                        setActiveBuildState(message.status);
                        console.log('[App] activeBuildState set to:', message.status);
                    } else {
                        console.log('[App] No active build (status is null)');
                        setActiveBuildState(null);
                    }
                    break;
            }
        };

        window.addEventListener('message', handleMessage);

        // Request initial data
        vscodePostMessage({ type: 'get-settings' });
        vscodePostMessage({ type: 'get-project-history' });
        vscodePostMessage({ type: 'get-personas' });
        vscodePostMessage({ type: 'get-token-usage' });
        console.log('[App] Requesting active build status on mount');
        vscodePostMessage({ type: 'get-active-build-status' }); // Request active build state on mount

        // Refresh token usage when webview becomes visible
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                vscodePostMessage({ type: 'get-token-usage' });
                console.log('[App] Requesting active build status on visibility change');
                vscodePostMessage({ type: 'get-active-build-status' }); // Restore build state if active
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('message', handleMessage);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    // Clear build logs
    const clearBuildLogs = useCallback(() => {
        setBuildLogs([]);
    }, []);

    // Post message helper for feature views
    const postMessage = useCallback((msg: any) => {
        vscodePostMessage(msg);
    }, []);

    // Header styles
    const headerStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.sm,
        padding: spacing.md,
        borderBottom: `1px solid ${colors.border}`,
        backgroundColor: colors.background.primary,
    };

    const topRowStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
    };

    const logoStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: spacing.sm,
    };

    const modeTabStyle = (isActive: boolean): React.CSSProperties => ({
        padding: `${spacing.xs} ${spacing.md}`,
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.medium,
        color: isActive ? colors.text.primary : colors.text.secondary,
        backgroundColor: isActive ? colors.background.tertiary : 'transparent',
        border: 'none',
        borderRadius: borderRadius.md,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    });

    const iconButtonStyle = (isActive: boolean): React.CSSProperties => ({
        padding: spacing.xs,
        color: isActive ? colors.text.primary : colors.text.secondary,
        backgroundColor: isActive ? colors.background.tertiary : 'transparent',
        border: 'none',
        borderRadius: borderRadius.md,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    });

    const containerStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        backgroundColor: colors.background.primary,
        color: colors.text.primary,
        fontFamily: typography.fontFamily.sans,
        borderRight: `1px solid ${colors.border}`,
    };

    const mainStyle: React.CSSProperties = {
        flex: 1,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
    };

    // Render view content based on current view
    const renderViewContent = () => {
        // If a special view is active (settings, userbase), show that
        if (view === 'settings') {
            return (
                <SettingsView
                    onSettingsChanged={setSettings}
                    postMessage={postMessage}
                />
            );
        }

        if (view === 'userbase') {
            return <UserBaseView postMessage={postMessage} />;
        }

        if (view === 'history') {
            return (
                <ChatView
                    userPersonas={userPersonas}
                    isHistoryOpen={true}
                    onHistoryClose={() => setView('main')}
                    userMessageColor={settings.userMessageColor}
                    agentMessageColor={settings.agentMessageColor}
                />
            );
        }

        // Main view depends on mode
        switch (mode) {
            case 'build':
                // Convert feedbackPersonas to UserPersona format for BuildView
                const buildPersonas = feedbackPersonas.map(p => ({
                    id: p.id,
                    name: p.name,
                    age: p.age,
                    occupation: p.occupation,
                    backstory: p.description,
                }));

                return (
                    <BuildView
                        logs={buildLogs}
                        onClearLogs={clearBuildLogs}
                        projectHistory={projectHistory}
                        onSelectProject={(name) => {
                            vscodePostMessage({ type: 'select-project', name });
                        }}
                        onStopBuild={() => {
                            // Stop-build message is now sent from BuildView with projectName
                        }}
                        availablePersonas={buildPersonas}
                        activeBuildState={activeBuildState}
                    />
                );

            case 'feedback':
                return (
                    <FeedbackView
                        personas={feedbackPersonas}
                        onGenerateFeedback={(screenshot, personaIds, context) => {
                            // Convert personaIds to personaNames for the backend
                            const personaNames = personaIds
                                .map((id) => feedbackPersonas.find((p) => p.id === id)?.name)
                                .filter((name): name is string => !!name);

                            vscodePostMessage({
                                type: 'generate-feedback',
                                data: {
                                    personaNames,
                                    context: context || '',
                                    url: screenshot?.url || '',
                                    screenshot: screenshot?.url,
                                    feedbackType: 'individual' as const,
                                },
                            });
                        }}
                        onCaptureUrl={(url) => {
                            vscodePostMessage({ type: 'capture-url-screenshot', url });
                        }}
                    />
                );

            case 'chat':
            default:
                return (
                    <ChatView
                        userPersonas={userPersonas}
                        userMessageColor={settings.userMessageColor}
                        agentMessageColor={settings.agentMessageColor}
                    />
                );
        }
    };

    return (
        <div style={containerStyle}>
            {/* Header */}
            <header style={headerStyle}>
                {/* Top Row: Logo, Mode Tabs, View Icons */}
                <div style={topRowStyle}>
                    {/* Logo */}
                    <div style={logoStyle}>
                        {window.iconUri && (
                            <img src={window.iconUri} alt="Personaut" style={{ width: 24, height: 24 }} />
                        )}
                        <span style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.bold }}>
                            Personaut
                        </span>
                    </div>

                    {/* Mode Tabs */}
                    <div style={{ display: 'flex', gap: spacing.xs }}>
                        <button
                            style={modeTabStyle(mode === 'chat')}
                            onClick={() => { setMode('chat'); setView('main'); }}
                        >
                            Chat
                        </button>
                        <button
                            style={modeTabStyle(mode === 'feedback')}
                            onClick={() => { setMode('feedback'); setView('main'); }}
                        >
                            Feedback
                        </button>
                        <button
                            style={modeTabStyle(mode === 'build')}
                            onClick={() => { setMode('build'); setView('main'); }}
                        >
                            Build
                        </button>
                    </div>

                    {/* View Icons */}
                    <div style={{ display: 'flex', gap: spacing.xs }}>
                        <button
                            style={iconButtonStyle(view === 'history')}
                            onClick={() => setView(view === 'history' ? 'main' : 'history')}
                            title="History"
                        >
                            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                        </button>
                        <button
                            style={iconButtonStyle(view === 'userbase')}
                            onClick={() => setView(view === 'userbase' ? 'main' : 'userbase')}
                            title="User Base"
                        >
                            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                        </button>
                        <button
                            style={iconButtonStyle(view === 'settings')}
                            onClick={() => setView(view === 'settings' ? 'main' : 'settings')}
                            title="Settings"
                        >
                            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                                <circle cx="12" cy="12" r="3" />
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                            </svg>
                        </button>
                        <button
                            style={iconButtonStyle(false)}
                            onClick={() => {
                                vscodePostMessage({ type: 'open-external', url: 'https://github.com/personaut/personaut/issues' });
                            }}
                            title="Report Bug"
                        >
                            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                                <rect x="8" y="6" width="8" height="14" rx="4" />
                                <path d="M8 10H3" />
                                <path d="M21 10h-5" />
                                <path d="M8 15H3" />
                                <path d="M21 15h-5" />
                                <path d="M8 6c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2" />
                                <path d="M6 20h12" />
                                <circle cx="10" cy="10" r="1" fill="currentColor" />
                                <circle cx="14" cy="10" r="1" fill="currentColor" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Token Usage */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.md,
                    fontSize: typography.fontSize.xs,
                    fontFamily: typography.fontFamily.mono,
                    backgroundColor: colors.background.tertiary,
                    padding: `${spacing.xs} ${spacing.sm}`,
                    borderRadius: borderRadius.md,
                }}>
                    <span style={{ color: colors.text.muted }}>
                        In: <span style={{ color: colors.text.secondary }}>{usage.inputTokens.toLocaleString()}</span>
                    </span>
                    <span style={{ color: colors.text.muted }}>
                        Out: <span style={{ color: colors.text.secondary }}>{usage.outputTokens.toLocaleString()}</span>
                    </span>
                    <div style={{ flex: 1 }} />
                    <span style={{ fontWeight: typography.fontWeight.bold, color: colors.text.primary }}>
                        Total: {usage.totalTokens.toLocaleString()}
                        {settings.rateLimit && settings.rateLimit > 0 && (
                            <span style={{ color: colors.text.muted, fontWeight: 'normal' }}>
                                {' '}/ {settings.rateLimit.toLocaleString()}
                            </span>
                        )}
                    </span>
                    <button
                        onClick={() => {
                            setUsage({ inputTokens: 0, outputTokens: 0, totalTokens: 0 });
                            vscodePostMessage({ type: 'reset-token-usage' });
                        }}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: spacing.xs,
                            color: colors.text.muted,
                            display: 'flex',
                        }}
                        title="Reset Token Counter"
                    >
                        <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                            <path d="M3 3v5h5" />
                        </svg>
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main style={mainStyle}>
                {renderViewContent()}
            </main>
        </div>
    );
}
