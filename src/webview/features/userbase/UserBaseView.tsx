/**
 * UserBaseView - Persona Management Interface
 *
 * Provides comprehensive persona management including:
 * - Persona list with search
 * - Create/Edit/Delete personas
 * - Backstory generation
 * - Team templates
 *
 * **Validates: Requirements 7.1-7.4, 15.2**
 */
import React, { useState, useEffect, useCallback } from 'react';
import { colors, spacing, borderRadius, typography, transitions } from '../../shared/theme';
import { Button } from '../../shared/components/ui';

// Types
export interface Persona {
    id: string;
    name: string;
    attributes: Record<string, string>;
    backstory?: string;
    createdAt: number;
    updatedAt: number;
}

interface AttributeRow {
    id: string;
    key: string;
    value: string;
}

export interface UserBaseViewProps {
    /** Handler to post messages to extension */
    postMessage?: (message: any) => void;
}

// Note: Team templates feature can be re-added later
// For now, we support manual persona creation only

/**
 * UserBaseView Component
 */
export function UserBaseView({ postMessage }: UserBaseViewProps) {
    const [personas, setPersonas] = useState<Persona[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isGeneratingBackstory, setIsGeneratingBackstory] = useState(false);

    // Form state
    const [personaName, setPersonaName] = useState('');
    const [attributeRows, setAttributeRows] = useState<AttributeRow[]>([]);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

    // Load personas on mount
    useEffect(() => {
        postMessage?.({ type: 'get-personas' });
    }, [postMessage]);

    // Listen for messages
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;
            switch (message.type) {
                case 'personas-loaded':
                    setPersonas(message.personas || []);
                    break;
                case 'persona-saved':
                    setSaveStatus('saved');
                    postMessage?.({ type: 'get-personas' });
                    setTimeout(() => setSaveStatus('idle'), 2000);
                    if (message.persona) {
                        setSelectedPersona(message.persona);
                    }
                    setIsEditing(false);
                    break;
                case 'persona-deleted':
                    postMessage?.({ type: 'get-personas' });
                    setSelectedPersona(null);
                    resetForm();
                    break;
                case 'backstory-generated':
                    setIsGeneratingBackstory(false);
                    if (message.persona) {
                        setSelectedPersona(message.persona);
                        postMessage?.({ type: 'get-personas' });
                    }
                    break;
                case 'backstory-error':
                    setIsGeneratingBackstory(false);
                    break;
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [postMessage]);

    const resetForm = useCallback(() => {
        setPersonaName('');
        setAttributeRows([]);
        setIsEditing(false);
    }, []);

    const handleNewPersona = useCallback(() => {
        setSelectedPersona(null);
        setPersonaName('');
        setAttributeRows([{ id: crypto.randomUUID(), key: '', value: '' }]);
        setIsEditing(true);
    }, []);

    const handleSelectPersona = useCallback((persona: Persona) => {
        setSelectedPersona(persona);
        setPersonaName(persona.name);
        setAttributeRows(
            Object.entries(persona.attributes).map(([key, value]) => ({
                id: crypto.randomUUID(),
                key,
                value,
            }))
        );
        setIsEditing(false);
    }, []);

    const handleSave = useCallback(() => {
        if (!personaName.trim()) {
            setSaveStatus('error');
            return;
        }

        setSaveStatus('saving');
        const attributes: Record<string, string> = {};
        attributeRows.forEach(row => {
            if (row.key.trim()) {
                attributes[row.key.trim()] = row.value.trim();
            }
        });

        postMessage?.({
            type: 'save-persona',
            id: selectedPersona?.id,
            name: personaName.trim(),
            attributes,
        });
    }, [personaName, attributeRows, selectedPersona, postMessage]);

    const handleDelete = useCallback(() => {
        if (selectedPersona) {
            postMessage?.({ type: 'delete-persona', id: selectedPersona.id });
        }
    }, [selectedPersona, postMessage]);

    const handleAddAttribute = useCallback(() => {
        setAttributeRows(prev => [...prev, { id: crypto.randomUUID(), key: '', value: '' }]);
    }, []);

    const handleRemoveAttribute = useCallback((id: string) => {
        setAttributeRows(prev => prev.filter(row => row.id !== id));
    }, []);

    const handleAttributeChange = useCallback((id: string, field: 'key' | 'value', value: string) => {
        setAttributeRows(prev =>
            prev.map(row => (row.id === id ? { ...row, [field]: value } : row))
        );
    }, []);


    const handleGenerateBackstory = useCallback(() => {
        if (selectedPersona) {
            setIsGeneratingBackstory(true);
            postMessage?.({ type: 'generate-backstory', id: selectedPersona.id });
        }
    }, [selectedPersona, postMessage]);

    // Filtered personas
    const filteredPersonas = personas.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Styles
    const containerStyle: React.CSSProperties = {
        display: 'flex',
        height: '100%',
        backgroundColor: colors.background.primary,
    };

    const sidebarStyle: React.CSSProperties = {
        width: 280,
        borderRight: `1px solid ${colors.border}`,
        display: 'flex',
        flexDirection: 'column',
    };

    const headerStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.md,
        borderBottom: `1px solid ${colors.border}`,
    };

    const searchStyle: React.CSSProperties = {
        padding: spacing.md,
    };

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: `${spacing.sm} ${spacing.md}`,
        backgroundColor: colors.background.tertiary,
        border: `1px solid ${colors.border}`,
        borderRadius: borderRadius.lg,
        color: colors.text.primary,
        fontSize: typography.fontSize.sm,
    };

    const listStyle: React.CSSProperties = {
        flex: 1,
        overflow: 'auto',
        padding: `0 ${spacing.sm}`,
    };

    const personaItemStyle = (isSelected: boolean): React.CSSProperties => ({
        padding: spacing.md,
        marginBottom: spacing.xs,
        borderRadius: borderRadius.lg,
        cursor: 'pointer',
        backgroundColor: isSelected ? `${colors.accent}15` : colors.background.secondary,
        border: `1px solid ${isSelected ? `${colors.accent}30` : 'transparent'}`,
        display: 'flex',
        alignItems: 'center',
        gap: spacing.sm,
        transition: transitions.fast,
    });

    const avatarStyle: React.CSSProperties = {
        width: 36,
        height: 36,
        borderRadius: '50%',
        backgroundColor: `${colors.accent}30`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: colors.accent,
        fontWeight: typography.fontWeight.bold,
        fontSize: typography.fontSize.sm,
    };

    const contentStyle: React.CSSProperties = {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
    };

    const formStyle: React.CSSProperties = {
        flex: 1,
        overflow: 'auto',
        padding: spacing.lg,
    };

    const actionBarStyle: React.CSSProperties = {
        padding: spacing.md,
        borderTop: `1px solid ${colors.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    };

    const emptyStateStyle: React.CSSProperties = {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: colors.text.muted,
        gap: spacing.md,
    };

    return (
        <div style={containerStyle}>
            {/* Sidebar */}
            <div style={sidebarStyle}>
                <div style={headerStyle}>
                    <span style={{
                        fontSize: typography.fontSize.xs,
                        fontWeight: typography.fontWeight.bold,
                        color: colors.text.muted,
                        textTransform: 'uppercase',
                    }}>
                        User Base
                    </span>
                    <Button variant="primary" size="sm" onClick={handleNewPersona}>
                        + New
                    </Button>
                </div>

                <div style={searchStyle}>
                    <input
                        type="text"
                        placeholder="Search personas..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={inputStyle}
                    />
                </div>

                <div style={listStyle}>
                    {filteredPersonas.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: spacing.lg, color: colors.text.muted }}>
                            {searchQuery ? 'No personas found' : 'No personas yet'}
                        </div>
                    ) : (
                        filteredPersonas.map(persona => (
                            <div
                                key={persona.id}
                                style={personaItemStyle(selectedPersona?.id === persona.id)}
                                onClick={() => handleSelectPersona(persona)}
                            >
                                <div style={avatarStyle}>
                                    {persona.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium }}>
                                        {persona.name}
                                    </div>
                                    <div style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary }}>
                                        {Object.keys(persona.attributes).length} traits
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Content */}
            <div style={contentStyle}>
                {!selectedPersona && !isEditing ? (
                    <div style={emptyStateStyle}>
                        <svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} style={{ opacity: 0.3 }}>
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                        </svg>
                        <p>Select a persona or create a new one</p>
                    </div>
                ) : (
                    <>
                        <div style={formStyle}>
                            {/* Name */}
                            <div style={{ marginBottom: spacing.lg }}>
                                <label style={{
                                    display: 'block',
                                    fontSize: typography.fontSize.xs,
                                    fontWeight: typography.fontWeight.bold,
                                    color: colors.text.muted,
                                    textTransform: 'uppercase',
                                    marginBottom: spacing.sm,
                                }}>
                                    Persona Name
                                </label>
                                <input
                                    type="text"
                                    value={personaName}
                                    onChange={e => setPersonaName(e.target.value)}
                                    disabled={!isEditing}
                                    placeholder="e.g., The Power User"
                                    style={{
                                        ...inputStyle,
                                        opacity: isEditing ? 1 : 0.7,
                                    }}
                                />
                            </div>

                            {/* Attributes */}
                            <div style={{ marginBottom: spacing.lg }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                                    <label style={{
                                        fontSize: typography.fontSize.xs,
                                        fontWeight: typography.fontWeight.bold,
                                        color: colors.text.muted,
                                        textTransform: 'uppercase',
                                    }}>
                                        Traits & Demographics
                                    </label>
                                    {isEditing && (
                                        <button
                                            onClick={handleAddAttribute}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: colors.accent,
                                                cursor: 'pointer',
                                                fontSize: typography.fontSize.xs,
                                            }}
                                        >
                                            + Add Trait
                                        </button>
                                    )}
                                </div>

                                {attributeRows.length === 0 ? (
                                    <div style={{
                                        padding: spacing.lg,
                                        textAlign: 'center',
                                        border: `2px dashed ${colors.border}`,
                                        borderRadius: borderRadius.lg,
                                        color: colors.text.muted,
                                        fontSize: typography.fontSize.xs,
                                    }}>
                                        {isEditing ? 'Click "Add Trait" to define characteristics' : 'No traits defined'}
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
                                        {attributeRows.map(row => (
                                            <div key={row.id} style={{ display: 'flex', gap: spacing.sm, alignItems: 'center' }}>
                                                <input
                                                    type="text"
                                                    value={row.key}
                                                    onChange={e => handleAttributeChange(row.id, 'key', e.target.value)}
                                                    disabled={!isEditing}
                                                    placeholder="Attribute"
                                                    style={{ ...inputStyle, flex: 1, opacity: isEditing ? 1 : 0.7 }}
                                                />
                                                <span style={{ color: colors.text.muted }}>:</span>
                                                <input
                                                    type="text"
                                                    value={row.value}
                                                    onChange={e => handleAttributeChange(row.id, 'value', e.target.value)}
                                                    disabled={!isEditing}
                                                    placeholder="Value"
                                                    style={{ ...inputStyle, flex: 1, opacity: isEditing ? 1 : 0.7 }}
                                                />
                                                {isEditing && (
                                                    <button
                                                        onClick={() => handleRemoveAttribute(row.id)}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            color: colors.text.muted,
                                                            cursor: 'pointer',
                                                            padding: spacing.xs,
                                                        }}
                                                    >
                                                        ✕
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Backstory (view only) */}
                            {selectedPersona && !isEditing && (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                                        <label style={{
                                            fontSize: typography.fontSize.xs,
                                            fontWeight: typography.fontWeight.bold,
                                            color: colors.text.muted,
                                            textTransform: 'uppercase',
                                        }}>
                                            Backstory
                                        </label>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={handleGenerateBackstory}
                                            loading={isGeneratingBackstory}
                                        >
                                            {selectedPersona.backstory ? '↻ Regenerate' : '⚡ Generate'}
                                        </Button>
                                    </div>
                                    {selectedPersona.backstory ? (
                                        <div style={{
                                            padding: spacing.md,
                                            backgroundColor: colors.background.secondary,
                                            border: `1px solid ${colors.border}`,
                                            borderRadius: borderRadius.lg,
                                            fontSize: typography.fontSize.sm,
                                            color: colors.text.secondary,
                                            lineHeight: typography.lineHeight.relaxed,
                                            whiteSpace: 'pre-wrap',
                                        }}>
                                            {selectedPersona.backstory}
                                        </div>
                                    ) : (
                                        <div style={{
                                            padding: spacing.lg,
                                            textAlign: 'center',
                                            border: `2px dashed ${colors.border}`,
                                            borderRadius: borderRadius.lg,
                                            color: colors.text.muted,
                                            fontSize: typography.fontSize.xs,
                                        }}>
                                            No backstory yet. Click "Generate" to create one.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Action Bar */}
                        <div style={actionBarStyle}>
                            <div>
                                {selectedPersona && !isEditing && (
                                    <button
                                        onClick={handleDelete}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: colors.error,
                                            cursor: 'pointer',
                                            fontSize: typography.fontSize.xs,
                                        }}
                                    >
                                        Delete Persona
                                    </button>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: spacing.sm, alignItems: 'center' }}>
                                {saveStatus === 'saved' && (
                                    <span style={{ fontSize: typography.fontSize.xs, color: colors.success }}>✓ Saved</span>
                                )}
                                {saveStatus === 'error' && (
                                    <span style={{ fontSize: typography.fontSize.xs, color: colors.error }}>Error</span>
                                )}

                                {isEditing ? (
                                    <>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                if (selectedPersona) {
                                                    handleSelectPersona(selectedPersona);
                                                } else {
                                                    resetForm();
                                                }
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            onClick={handleSave}
                                            loading={saveStatus === 'saving'}
                                        >
                                            Save Persona
                                        </Button>
                                    </>
                                ) : (
                                    <Button variant="primary" size="sm" onClick={() => setIsEditing(true)}>
                                        Edit
                                    </Button>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default UserBaseView;
