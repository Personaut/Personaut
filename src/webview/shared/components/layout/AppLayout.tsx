import React from 'react';
import { colors, spacing, borderRadius, typography, transitions } from '../../theme';

/**
 * App mode options
 */
export type AppMode = 'chat' | 'build' | 'feedback';

/**
 * App view options
 */
export type AppView = 'main' | 'userbase' | 'settings' | 'history';

/**
 * AppLayout component props
 */
export interface AppLayoutProps {
    /** Current mode */
    mode: AppMode;
    /** Current view */
    view: AppView;
    /** Mode change handler */
    onModeChange: (mode: AppMode) => void;
    /** View change handler */
    onViewChange: (view: AppView) => void;
    /** Show header */
    showHeader?: boolean;
    /** Show navigation */
    showNav?: boolean;
    /** Children */
    children: React.ReactNode;
}

/**
 * Mode configuration
 */
const MODE_CONFIG: Record<AppMode, { label: string; icon: string }> = {
    chat: { label: 'Chat', icon: '💬' },
    build: { label: 'Build', icon: '🔨' },
    feedback: { label: 'Feedback', icon: '📝' },
};

/**
 * View configuration
 */
const VIEW_CONFIG: Record<AppView, { label: string; icon: string }> = {
    main: { label: 'Main', icon: '🏠' },
    userbase: { label: 'UserBase', icon: '👥' },
    settings: { label: 'Settings', icon: '⚙️' },
    history: { label: 'History', icon: '📜' },
};

/**
 * AppLayout component provides consistent header and navigation.
 *
 * @example
 * ```tsx
 * <AppLayout
 *   mode="chat"
 *   view="main"
 *   onModeChange={setMode}
 *   onViewChange={setView}
 * >
 *   <ChatView />
 * </AppLayout>
 * ```
 *
 * **Validates: Requirements 28.1, 28.2**
 */
export function AppLayout({
    mode,
    view,
    onModeChange,
    onViewChange,
    showHeader = true,
    showNav = true,
    children,
}: AppLayoutProps) {
    const containerStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: colors.background.primary,
        overflow: 'hidden',
    };

    const headerStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: `${spacing.sm} ${spacing.md}`,
        borderBottom: `1px solid ${colors.border}`,
        backgroundColor: colors.background.secondary,
        flexShrink: 0,
    };

    const logoStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: spacing.sm,
        fontSize: typography.fontSize.lg,
        fontWeight: typography.fontWeight.bold,
        color: colors.text.primary,
    };

    const navStyle: React.CSSProperties = {
        display: 'flex',
        gap: spacing.xs,
    };

    const tabStyle = (isActive: boolean): React.CSSProperties => ({
        padding: `${spacing.xs} ${spacing.sm}`,
        backgroundColor: isActive ? colors.accent : 'transparent',
        border: 'none',
        borderRadius: borderRadius.md,
        color: isActive ? '#1E1E1E' : colors.text.secondary,
        fontSize: typography.fontSize.sm,
        fontWeight: isActive ? typography.fontWeight.medium : typography.fontWeight.normal,
        cursor: 'pointer',
        transition: transitions.fast,
        display: 'flex',
        alignItems: 'center',
        gap: spacing.xs,
    });

    const mainStyle: React.CSSProperties = {
        flex: 1,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
    };

    const contentStyle: React.CSSProperties = {
        flex: 1,
        overflow: 'auto',
    };

    const footerNavStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'space-around',
        padding: spacing.sm,
        borderTop: `1px solid ${colors.border}`,
        backgroundColor: colors.background.secondary,
    };

    const footerTabStyle = (isActive: boolean): React.CSSProperties => ({
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '2px',
        padding: spacing.xs,
        backgroundColor: 'transparent',
        border: 'none',
        borderRadius: borderRadius.md,
        color: isActive ? colors.accent : colors.text.muted,
        fontSize: typography.fontSize.xs,
        cursor: 'pointer',
        transition: transitions.fast,
    });

    return (
        <div style={containerStyle}>
            {/* Header */}
            {showHeader && (
                <header style={headerStyle}>
                    <div style={logoStyle}>
                        <span>🤖</span>
                        <span>Personaut</span>
                    </div>
                    <nav style={navStyle}>
                        {(Object.entries(MODE_CONFIG) as [AppMode, typeof MODE_CONFIG.chat][]).map(
                            ([key, config]) => (
                                <button
                                    key={key}
                                    style={tabStyle(mode === key)}
                                    onClick={() => onModeChange(key)}
                                    aria-selected={mode === key}
                                >
                                    <span>{config.icon}</span>
                                    <span>{config.label}</span>
                                </button>
                            )
                        )}
                    </nav>
                </header>
            )}

            {/* Main Content */}
            <main style={mainStyle}>
                <div style={contentStyle}>{children}</div>
            </main>

            {/* Footer Navigation */}
            {showNav && (
                <nav style={footerNavStyle}>
                    {(Object.entries(VIEW_CONFIG) as [AppView, typeof VIEW_CONFIG.main][]).map(
                        ([key, config]) => (
                            <button
                                key={key}
                                style={footerTabStyle(view === key)}
                                onClick={() => onViewChange(key)}
                                aria-selected={view === key}
                            >
                                <span style={{ fontSize: '20px' }}>{config.icon}</span>
                                <span>{config.label}</span>
                            </button>
                        )
                    )}
                </nav>
            )}
        </div>
    );
}

export default AppLayout;
